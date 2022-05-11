// Mocking all aws-sdk, Firehose and zlib calls
const mockPutRecord = jest.fn(() => ({
        promise: () => Promise.resolve({})
    }));

const mockGzip = jest.fn((input, cb) => {
    cb(null, `gzipped[${input}]`);
});

const mockFirehose = jest.fn(() => ({
        putRecord: mockPutRecord
    }));

jest.mock('aws-sdk', () => ({
        Firehose: mockFirehose
    }));

jest.mock('zlib', () => ({
        gzip: mockGzip
    }));

const publisher = require('./firehose');

const validEvent = {
    __origin__: 'action',
    a: 1,
    b: 'test'
};

const eventMissingOriginField = { a: 1, b: 'test' };

it('should sent a event to firehose', async () => {
    expect.assertions(5);

    const status = await publisher.publishToFirehose(validEvent, 'test');

    expect(mockGzip).toHaveBeenCalledTimes(1);
    expect(mockGzip.mock.calls[0][0]).toBe('{"__origin__":"action","a":1,"b":"test"}\n');

    expect(mockPutRecord).toHaveBeenCalledTimes(1);
    expect(mockPutRecord).toHaveBeenLastCalledWith({
        DeliveryStreamName: 'test',
        Record: {
            Data: 'gzipped[{"__origin__":"action","a":1,"b":"test"}\n]',
        }
    });
    expect(status.eventSent).toBe(true);
});

it('should fail silently when zipping fails', async () => {
    expect.assertions(2);

    mockGzip.mockImplementationOnce((input, cb) => {
        cb(new Error("I'm not zipping it"));
    });
    const { eventSent, error } = await publisher.publishToFirehose(validEvent, 'test');

    expect(eventSent).toBe(false);
    expect(error.message).toMatch(/I'm not zipping it/);
});

it('should fail silently when delivery fails', async () => {
    expect.assertions(2);

    mockPutRecord.mockReturnValueOnce({
        promise: () => Promise.reject(new Error('BOOM'))
    });
    const { eventSent, error } = await publisher.publishToFirehose(validEvent, 'test');

    expect(eventSent).toBe(false);
    expect(error.message).toMatch(/BOOM/);
});

it('should check for an "__origin__" field in event', async () => {
    expect.assertions(2);

    const { eventSent, error } = await publisher.publishToFirehose(eventMissingOriginField, 'test');

    expect(eventSent).toBe(false);
    expect(error.message).toMatch(/"__origin__" field missing at the root of the event/);
});

it('should check that a delivery stream name is given', async () => {
    expect.assertions(2);

    const { eventSent, error } = await publisher.publishToFirehose(validEvent, null);

    expect(eventSent).toBe(false);
    expect(error.message).toMatch(/Missing Firehose Delivery Stream name/);
});

it('should default the region to "eu-west-1"', async () => {
    expect.assertions(2);

    const { eventSent } = await publisher.publishToFirehose(validEvent, 'test');

    expect(eventSent).toBe(true);
    expect(mockFirehose).toHaveBeenLastCalledWith({ region: 'eu-west-1' });
});

it('should default the region with AWS_REGION env var when present', async () => {
    expect.assertions(2);

    process.env.AWS_REGION = 'ap-southeast-1';

    const { eventSent } = await publisher.publishToFirehose(validEvent, 'test');

    process.env.AWS_REGION = null;

    expect(eventSent).toBe(true);
    expect(mockFirehose).toHaveBeenLastCalledWith({ region: 'ap-southeast-1' });
});

it('should override the region when explicitly given', async () => {
    expect.assertions(2);

    const { eventSent } = await publisher.publishToFirehose(validEvent, 'test', 'us-east-1');

    expect(eventSent).toBe(true);
    expect(mockFirehose).toHaveBeenLastCalledWith({ region: 'us-east-1' });
});
