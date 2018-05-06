/**
 * @jest-environment node
 */

const _ = require('lodash');
const { ContextSimulator } = require('bottender/test-utils');
const Select = require('../select');
const Drama = require('../../index');
jest.mock('../../index');
Drama.mockImplementation(() => ({
  botType: 'LineBot',
  mediaFolder: '/Users/pepper/Downloads/GenImage',
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
  // const text = 'Hello!';
  // const config = {
  //   key: 'SOME_REPLY_KEY',
  //   property: {
  //     selectForm: 'image',
  //     selection_list: [{
  //       title: '開啟留言顯示',
  //       message: 'hi1',
  //     }, {
  //       title: '真的要關閉機器人留言',
  //       message: 'hi1',
  //     }, {
  //       title: '送出問券調查',
  //       message: 'hi1',
  //     }, {
  //       title: '親愛的貴賓您好',
  //       message: 'hi1',
  //     }, {
  //       title: '為了提供高品質的餐點與服務，哈哈哈哈',
  //       message: 'hi1',
  //     }, {
  //       title: '貴賓您好',
  //       message: 'hi1',
  //     }],
  //   },
  // };
  // const select = new Select(drama, config);
  it('should constructor reply', async () => {
    expect().toBeUndefined();
    // select.generateImageFile('', config.property.selection_list, config.property);
    // expect(reply.sceneType).toBe('BOT_REPLY');
    // expect(await reply.getTriggerHandler()).toBe('reply');
    // expect(await reply.getMulticastHandler()).toBe('multicast');
  });
});
