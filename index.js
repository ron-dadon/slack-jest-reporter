const fs = require('fs')
const { WebClient } = require('@slack/web-api')

const TEXTS = {
  runStart: 'Tests started',
  runCompletePassed: 'Tests passed',
  runCompleteFailed: 'Tests failed',
  runProgress: 'Tests running {progress}%',
  testCaseResultPassed: '{testName} - passed in {duration}ms',
  testCaseResultFailed: '{testName} - failed in {duration}ms'
}

const defaultOptions = {
  slackBotToken: null,
  slackChannelId: null,
  slackBotTokenEnvVar: 'SLACK_BOT_TOKEN',
  slackChannelIdEnvVar: 'SLACK_CHANNEL_ID',
  texts: {},
  attachScreenshots: false,
  attachScreenshotsOnlyOnFail: true,
  screenshotsPattern: '^{testName}\\.jpg$',
  screenshotsPath: './',
}

class SlackReporter {
  constructor(_, reporterOptions) {
    this._options = { ...defaultOptions, ...reporterOptions }
    this._slackBotToken = this._options.slackBotToken || process.env[this._options.slackBotTokenEnvVar]
    this._slackChannelId = this._options.slackChannelId || process.env[this._options.slackChannelIdEnvVar]
    this._texts = {
      ...TEXTS,
      ...(this._options.texts || {})
    }
    if (!this._slackBotToken) {
      console.warn('slack-jest-reporter: bot token is missing, please provide bot token using the reporter options or environment variable SLACK_BOT_TOKEN')
    }
    if (!this._slackChannelId) {
      console.warn('slack-jest-reporter: channel ID is missing, please provide channel ID using the reporter options or environment variable SLACK_CHANNEL_ID')
    }
    if (this._slackBotToken && this._slackChannelId) {
      this._slack = new WebClient(this._slackBotToken || process.env.SLACK_BOT_TOKEN)
    }
  }

  async _postMessage(options) {
    if (!this._slack) return
    return this._slack.chat.postMessage({
      channel: this._slackChannelId,
      ...options,
    })
  }

  async _postReply(options) {
    if (!this._slack) return
    const payload = {
      channel: this._slackChannelId,
      thread_ts: this._slackThreadTs,
      ...options,
    }
    return this._slack.chat.postMessage(payload)
  }

  async _postScreenshots({ testName }) {
    if (!this._slack) return
    if (!this._options.attachScreenshots) return

    const files = fs.readdirSync(this._options.screenshotsPath)
    if (!files.length) return

    const pattern = this._options.screenshotsPattern.replaceAll('{testName}', testName)
    const matcherRegex = new RegExp(pattern)
    const matchingFiles = files.filter((file) => matcherRegex.test(file))
    if (!matchingFiles.length) return

    const results = await Promise.allSettled(matchingFiles.map((file) => {
      const data = fs.readFileSync(`${this._options.screenshotsPath}${file}`)
      return this._slack.files.uploadV2({
        channel: this._slackChannelId,
        thread_ts: this._slackThreadTs,
        file: data,
        filename: file,
      })
    }))

    results.forEach(({ status, reason }, i) =>
      status === 'rejected'
      && console.warn(
        `slack-jest-reporter: failed to upload screenshot ${matchingFiles[i]}: ${reason.message}`,
        reason
        )
    )
  }

  async _updateMessage(options) {
    if (!this._slack) return
    return this._slack.chat.update({
      channel: this._slackChannelId,
      ts: this._slackThreadTs,
      ...options,
    })
  }

  async onRunStart() {
    try {
      const text = typeof this._texts.runStart === 'function'
        ? this._texts.runStart()
        : this._texts.runStart
      const { ts } = await this._postMessage({
        text,
        link_names: 1,
      })
      this._slackThreadTs = ts
    } catch (e) {
      console.warn('slack-jest-reporter: failed to publish run start message', e)
    }
  }

  async onRunComplete(_, results) {
    const text = !results.numFailedTests ? this._texts.runCompletePassed : this._texts.runCompleteFailed
    try {
      await this._updateMessage({
        text: typeof text === 'function' ? text(results) : text,
        link_names: 1,
      })
    } catch (e) {
      console.warn('slack-jest-reporter: failed to publish run complete message', e)
    }
  }

  async onTestCaseResult(test, testCaseResult) {
    try {
      const resultText = testCaseResult.status === 'passed'
        ? this._texts.testCaseResultPassed
        : this._texts.testCaseResultFailed
      const text = typeof resultText === 'function' ? resultText(testCaseResult) : resultText
        .replaceAll('{testName}', testCaseResult.fullName)
        .replaceAll('{duration}', testCaseResult.duration)
      await this._postReply({ text })
      if (this._options.attachScreenshotsOnlyOnFail && testCaseResult.status === 'passed') return
      await this._postScreenshots({ testName: testCaseResult.fullName })
    } catch (e) {
      console.warn('slack-jest-reporter: failed to publish run test case result', e)
    }
  }

  async onTestResult(_, __, result) {
    const { numPassedTestSuites: passed, numFailedTestSuites: failed, numTotalTestSuites: total } = result
    const progress = Math.round((passed + failed) / total * 100)
    try {
      await this._updateMessage({
        text: typeof this._texts.runProgress === 'function'
          ? this._texts.runProgress({ passed, failed, total, progress })
          : this._texts.runProgress.replaceAll('{progress}', progress),
        link_names: 1,
      })
    } catch (e) {
      console.warn('slack-jest-reporter: failed to publish run progress message', e)
    }
  }
}

module.exports = SlackReporter
