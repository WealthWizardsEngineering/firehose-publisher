/* eslint no-underscore-dangle: ["error", { "allow": ["__origin__"] }] */

const { Firehose } = require('aws-sdk');
const { promisify } = require('util');
const zlib = require('zlib');

const gzip = promisify(zlib.gzip);

exports.publishToFirehose = async (event, streamName, region = process.env.AWS_REGION || 'eu-west-1') => {
  try {
    if (!event || !event.__origin__) {
        throw new Error('"__origin__" field missing at the root of the event');
    }

    if (!streamName) {
        throw new Error('Missing Firehose Delivery Stream name');
    }

    const data = `${JSON.stringify(event)}\n`;

    const compressed = await gzip(data);

    const recordParams = {
      DeliveryStreamName: streamName,
      Record: {
        Data: compressed,
      },
    };

    const firehose = new Firehose({ region });
    await firehose.putRecord(recordParams).promise();
    return { eventSent: true };
  } catch (e) {
    return {
        eventSent: false,
        error: e
    };
  }
};
