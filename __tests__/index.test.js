/**
 * @jest-environment node
 */

const { LineBot, ViberBot } = require('bottender');
const Drama = require('../index.js');

jest.mock('../scenes/index', () => ({
  mock_scene: jest.fn().mockImplementation(() => ({
    mock_key: 'mock_scene_key',
    multicast: jest.fn(),
    trigger: jest.fn(),
  })),
}));
const SceneMap = require('../scenes/index');

describe('Drama constructor', async () => {
  it('should constructor throw error when not provide bot', async () => {
    expect(() => {
      const drama = new Drama();
    }).toThrow(/^property.bot not defined/);
  });
  it('should throw error when use unsuppoted bot type', async () => {
    expect(() => {
      const bot = new ViberBot({
        accessToken: 'NIwid924kI2ekd2K2kd/rT+kdKodo3K2odklwl29ioenUS9vvjeiJJKcjJ06NhYNNlXfO9eeMMZiHbHFhT/T/3ccAKiVR/FH3HrXPlMBbpwO/zR2iu51ohqhHnfSGnVidnLRPU/8Wttxo/tKAlMv5wdB04t89/1O/w1cDnyilFU=',
      });
      const drama = new Drama({
        bot,
      });
    }).toThrow(/^Currentlly only supported/);
  });
  it('should constructor', async () => {
    const bot = new LineBot({
      accessToken: 'NIwid924kI2ekd2K2kd/rT+kdKodo3K2odklwl29ioenUS9vvjeiJJKcjJ06NhYNNlXfO9eeMMZiHbHFhT/T/3ccAKiVR/FH3HrXPlMBbpwO/zR2iu51ohqhHnfSGnVidnLRPU/8Wttxo/tKAlMv5wdB04t89/1O/w1cDnyilFU=',
      channelSecret: '092afb2ea828185ca8f5b8ee697ac8f5',
    });
    const drama = new Drama({
      bot,
    });
    expect(drama.bot).toBe(bot);
    expect(drama.sceneInstanceMap).toEqual({});
    expect(drama.botType).toBe('LineBot');
    expect(drama.handler.constructor.name).toBe('LineHandler');
    expect(drama.client.constructor.name).toBe('LineClient');
  });
});

describe('Drama scene control', async () => {
  const bot = new LineBot({
    accessToken: 'NIwid924kI2ekd2K2kd/rT+kdKodo3K2odklwl29ioenUS9vvjeiJJKcjJ06NhYNNlXfO9eeMMZiHbHFhT/T/3ccAKiVR/FH3HrXPlMBbpwO/zR2iu51ohqhHnfSGnVidnLRPU/8Wttxo/tKAlMv5wdB04t89/1O/w1cDnyilFU=',
    channelSecret: '092afb2ea828185ca8f5b8ee697ac8f5',
  });
  const drama = new Drama({
    bot,
  });
  const sceneType = 'mock_scene';
  const key = 'ADD_SCENE_KEY';
  const notExistSceneKey = 'NOT_EXIST_SCENE_KEY';
  const config = {
    type: sceneType,
    property: {},
  };
  const mockContext = {};
  const userIdList = ['pepper', 'angela'];
  drama.addScene(key, config);
  it('should addScene work', async () => {
    expect(SceneMap[sceneType]).toBeCalled();
    expect(drama.sceneInstanceMap[key].mock_key).toBe('mock_scene_key');
  });
  it('should fine when scene type not exist', () => {
    expect(() => {
      drama.addScene(notExistSceneKey, {});
      expect(drama.sceneInstanceMap[notExistSceneKey]).toBeUndefined();
    }).toThrow(/^Scene type/);
  });
  it('should trigScene call trigger', async () => {
    await drama.trigScene(mockContext, key);
    expect(drama.sceneInstanceMap[key].trigger).toBeCalledWith(mockContext, undefined);
  });
  it('should fine when scene key not exist', async () => {
    drama.sceneInstanceMap[key].trigger.mockClear();
    await drama.trigScene(mockContext, notExistSceneKey);
    expect(drama.sceneInstanceMap[key].trigger).toHaveBeenCalledTimes(0);
  });
  it('should trigScene call multicast when give userlist', async () => {
    await drama.trigScene(mockContext, key, {}, userIdList);
    expect(drama.sceneInstanceMap[key].multicast).toBeCalledWith(mockContext, {}, userIdList);
  });
});
