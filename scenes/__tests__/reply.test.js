/**
 * @jest-environment node
 */

const _ = require('lodash');
const { ContextSimulator } = require('bottender/test-utils');
const Reply = require('../reply');
const Drama = require('../../index');
jest.mock('../../index');
Drama.mockImplementation(() => ({
  botType: 'LineBot',
  handler: {
    onText: jest.fn(),
    onPostback: jest.fn(),
  },
  client: {
    multicast: jest.fn(),
  },
  trigScene: jest.fn(),
}));

const drama = new Drama();
const simulator = new ContextSimulator({
  platform: 'line',
});

describe('Basic reply feature', async () => {
  const text = 'Hello!';
  const config = {
    key: 'SOME_REPLY_KEY',
    property: {},
  };
  const reply = new Reply(drama, config);
  it('should constructor reply', async () => {
    expect(reply.sceneType).toBe('BOT_REPLY');
    expect(await reply.getTriggerHandler(null, config.property)).toBe('reply');
    expect(await reply.getMulticastHandler(null, config.property)).toBe('multicast');
  });
  it('should reply by property (single message)', async () => {
    const property = {
      type: 'text',
      text,
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'text',
      text,
    }]]);
  });
  it('should reply by message_list (multiple message)', async () => {
    const property = {
      message_list: [{
        type: 'text',
      }, {
        type: 'image',
      }, {
        type: 'confirm',
      }],
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter[0].length).toBe(3);
    expect(parameter[0][0].type).toBe('text');
    expect(parameter[0][1].type).toBe('image');
    expect(parameter[0][2].type).toBe('template');
  });
  it('should return text message when type of message is unknow', async () => {
    const type = 'unknow_type';
    const property = {
      type,
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'text',
      text: `Unknow message type: ${type}`,
    }]]);
  });
  it('should support text message', async () => {
    const property = {
      type: 'text',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'text',
      text: 'Text not set',
    }]]);
  });
  it('should support image message', async () => {
    const property = {
      type: 'image',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'image',
      originalContentUrl: 'https://goo.gl/dKUVh4',
      previewImageUrl: 'https://goo.gl/dKUVh4',
    }]]);
  });
  it('should support video message', async () => {
    const property = {
      type: 'video',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'video',
      originalContentUrl: 'http://www.html5videoplayer.net/videos/toystory.mp4',
      previewImageUrl: 'https://goo.gl/cjf6QY',
    }]]);
  });
  it('should support audio message', async () => {
    const property = {
      type: 'audio',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'audio',
      duration: 4000,
      originalContentUrl: 'https://goo.gl/VbuV79',
    }]]);
  });
  it('should support location message', async () => {
    const property = {
      type: 'location',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'location',
      title: 'MyBigDay Cafe',
      address: '台北市中山區中原街 40 號',
      latitude: 25.057524,
      longitude: 121.528775,
    }]]);
  });
  it('should support location message', async () => {
    const property = {
      type: 'sticker',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'sticker',
      packageId: '1',
      stickerId: '3',
    }]]);
  });
  it('should support confirm message', async () => {
    const property = {
      type: 'confirm',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'template',
      altText: 'Text not set',
      template: {
        type: 'confirm',
        text: 'Text not set',
        actions: [{
          type: 'message',
          label: '是',
          text: 'Yes',
        }, {
          type: 'message',
          label: '否',
          text: 'No',
        }],
      },
    }]]);
  });
  it('should support select message', async () => {
    const property = {
      type: 'select',
    };
    const parameter = await reply.generateParameter({}, property);
    expect(parameter).toEqual([[{
      type: 'template',
      altText: 'Text not set',
      template: {
        type: 'buttons',
        text: 'Text not set',
        actions: [{
          type: 'message',
          label: '尚未設定標題',
          text: 'UNDEFINED_MESSAGE',
        }],
      },
    }]]);
  });

  // it('should reply by meassage list');
});
