# firehose-publisher [![CircleCI](https://circleci.com/gh/WealthWizardsEngineering/firehose-publisher.svg?style=svg)](https://circleci.com/gh/WealthWizardsEngineering/firehose-publisher)

This is a simple lib that will publish a JSON object to a `Firehose` stream as a gzipped one line string representation (including a newline `\n` at the end).

It will __fail silently__ if the event or the stream name is missing or if there is a problem with sending it to `AWS Firehose`. 
The reason for this behaviour is that we don't want the normal flow of a service/app to fail in case of misconfiguration or errors (bearing in mind this is mostly use to send data to our datalake). We still want it to behave this way for now but that might change in the future.

## Getting Started

```javascript
const { publishToFirehose } = require('firehose-publisher');
```

```javascript
const resp = publishToFirehose(event, 'my-firehose-stream-name');
if (!resp.eventSent) {
    // Logging the error if we can't send the event to firehose
    console.error('Failure to sent event to Firehose', event.error);
}
```
## API

`publishToFirehose(event, streamName, region)`

- Parameters
    1. `event` - *JSON Object* - Payload to send to Firehose stream. __Must have__ an `__origin__` field at the root.
    1. `streamName` - *String* - Firehose stream name to send the event to.
    1. `region` - *String* __*Optional*__ - AWS Region where the Firehose stream resides. Defaults to `process.env.AWS_REGION` if present or `eu-west-1` otherwise.

- Returns an object with:
    1. `eventSent` - *Boolean* - if the event was sent successfully or not.
    1. `error` - *Error* __*Optional*__ - Error caught when trying to send the event.


