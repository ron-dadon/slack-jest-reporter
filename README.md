# slack-jest-reporter
A customizable slack bot reporter for jest

## Installation

With yarn:

```shell
$ yarn add slack-jest-reporter
```

With NPM:

```shell
$ npm install slack-jest-reporter
```

## Jest configuration

Edit your `jest.config.js|ts|mjs|cjs|json` file, and add the reporter to your `reporters` array.
If you don't have the reports key, add it.

> RECOMMENDED: Place `"default"` as the first array value to keep the default CLI reporting of jest

An example for `json` file:

```json
{
  ...
  "reporters": [
    "default",
    [
      "slack-jest-reporter",
      {
        "slackBotToken": "XXX",
        "slackChannelId": "XXX",
        "texts": {
          "runStart": "🚀 Tests starting",
          "runCompletePassed": "🟢 Tests passed",
          "runCompleteFailed": "❌ Tests failed",
          "testCaseResultPassed": "✅ {testName} (⏳{duration}ms)",
          "testCaseResultFailed": "🆘 {testName} (⏳{duration}ms)"
        }
      }
    ]
  ]
}
```

If you are using code for your configuration (`.js` extensions), you can pass functions for the
texts keys, that will get the tests results where applicable, so you can better customize your message.
If you pass a string, it will be used, if you pass a function, the returned string will be used.

```js
{
  reporters: [
    'default',
    [
      'slack-jest-reporter',
      {
        slackBotToken: 'XXX',
        slackChannelId: 'XXX',
        texts: {
          runStart: '🚀 Tests starting',
          runCompletePassed: (results) => "🟢 Tests passed",
          runCompleteFailed: (results) => "❌ Tests failed",
          testCaseResultPassed: (testCaseResult) => `✅ ${testCaseResult.fullName} (⏳${testCaseResult.duration}ms)`,
          testCaseResultFailed: '🆘 {testName} (⏳{duration}ms)'
        }
      }
    ]
  ]
}
```

### Configuration options

| key                    | type     | description                                                                                                                                                                                                     |
|------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `slackBotToken`        | `string` | The bot token to use for posting messages. The bot should have the `` scopes.                                                                                                                                   |
| `slackChannelId`       | `string` | The ID of the channel the bot should post the messages to. The bot should be a member of this channel.                                                                                                          |
| `slackBotTokenEnvVar`  | `string` | An alternative to `slackBotToken`. If `slackBotToken` is not present, the reporter will try to read the token from an environment variable specified in this option. Default value is `SLACK_BOT_TOKEN`         |
| `slackChannelIdEnvVar` | `string` | An alternative to `slackChannelId`. If `slackChannelId` is not present, the reporter will try to read the channel ID from an environment variable specified in this option. Default value is `SLACK_CHANNEL_ID` |
| `texts`                | `object` | An object containing the bot messages for each test phase. See defaults and possible keys below.                                                                                                                |

#### Texts

The reporter allows for full customization of the messages that will be posted by the slack bot.
The following table contains all the possible keys available for customization.

| key                    | type                         | description                                                                                                                                                                                                                                                                                                                                 | default                                 |
|------------------------|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| `runStart`             | `string/() => string`        | The first message posted before all the tests starts. All the test cases reports will be posted as replies to this message.                                                                                                                                                                                                                 | `'Tests started'`                       |
| `runCompletePassed`    | `string/(results) => string` | The message to show as the thread primary message when all the tests completed and passed. This message will replace the original message posted when the test run starts                                                                                                                                                                   | `'Tests passed'`                        |
| `runCompleteFailed`    | `string/(results) => string` | The message to show as the thread primary message when all the tests completed and one or more failed. This message will replace the original message posted when the test run starts                                                                                                                                                       | `'Tests failed'`                        |
| `testCaseResultPassed` | `string/(results) => string` | The message post when a test case completed and passed. This message will be appended as an reply in the thread started by when the tests run started. When using a string, you can use `{testName}`, `{duration}` keys in the string as a template placeholders, and they will be replaced with the actual value from the test case result | `'{testName} - passed in {duration}ms'` |
| `testCaseResultFailed` | `string/(results) => string` | The message post when a test case completed and failed. This message will be appended as an reply in the thread started by when the tests run started. When using a string, you can use `{testName}`, `{duration}` keys in the string as a template placeholders, and they will be replaced with the actual value from the test case result | `'{testName} - failed in {duration}ms'` |
