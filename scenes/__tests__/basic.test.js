/**
 * @jest-environment node
 */

const _ = require('lodash');
const { ContextSimulator } = require('bottender/test-utils');
const Drama = require('../../index');
jest.mock('../../index');
Drama.mockImplementation(() => ({
  handler: {
    onText: jest.fn(),
    onPostback: jest.fn(),
  },
  client: {
    multicast: jest.fn(),
  },
  trigScene: jest.fn(),
}));
const Basic = require('../basic');

const simulator = new ContextSimulator({
  platform: 'line',
});
const drama = new Drama();

describe('Basic scene trigger', async () => {
  const key = 'NewBasic';
  const instanceKey = 'HI@Pepper';
  const predicate = /^HI/;
  const message = 'Hello World';
  const description = 'This is great description';
  const context = simulator.createTextContext(instanceKey);
  const config = {
    key,
    trigger_type: 'text',
    predicate,
    property: {
      title: message,
      description: () => (description),
      user_id: async (inContext) => (
        Promise.resolve(`Hi ${inContext.session.user.id}`)
      ),
    },
  };
  const basic = new Basic(drama, config);

  it('should construct', async () => {
    expect(basic.key).toBe(key);
    expect(basic.sceneType).toBe('BOT_BASIC');
    expect(basic.config).toBe(config);
  });
  it('should bind trigger', async () => {
    expect(drama.handler.onText).toBeCalled();
  });
  it('should set default triggerHandler and multicastHandler', async () => {
    expect(basic.triggerHandler).toBe('reply');
    expect(basic.multicastHandler).toBe('multicast');
  });
  it('should set state at state', async () => {
    await basic.trigger(context);
    expect(context.state.trigger_key).toBe(instanceKey);
    expect(context.state.current_scene_type).toBe('BOT_BASIC');
    expect(context.state.current_scene_key).toBe(key);
    expect(context.state.last_scene_key).toBe('');
  });
  it('should replace dynamic property', async () => {
    expect(context.state.current_scene_property.title).toBe(message);
    expect(context.state.current_scene_property.description).toBe(description);
    expect(context.state.current_scene_property.user_id).toBe('Hi __ID__');
  });
  it('should filter out when not current scene', async () => {
    const result1 = await basic.filter('LW_NO_PASS', context);
    const result2 = await basic.filter('WILL_PASS', context);
    context.setState({
      current_scene_type: 'not_exist_scene',
    });
    const result3 = await basic.filter('WILL_PASS', context);
    context.setState({
      current_scene_type: 'BOT_BASIC',
      current_scene_key: 'not_exist_key',
    });
    const result4 = await basic.filter('WILL_PASS', context);
    context.setState({
      current_scene_key: key,
    });
    const result5 = await basic.filter('WILL_PASS_AGAIN', context);
    expect(result1).toBe(false);
    expect(result2).toBe(true);
    expect(result3).toBe(false);
    expect(result4).toBe(false);
    expect(result5).toBe(true);
  });
  it('should always pass at default beforeTrigger', async () => {
    const result = await basic.beforeTrigger(context);
    expect(result).toBe(true);
  });
  it('should call conclusion when beforeTrigger throw error', async () => {
    class BeforeTriggerError extends Basic {
      async beforeTrigger() {
        return Promise.reject('GO_TO_CONCLUSION');
      }
    }
    const beforeTriggerError = new BeforeTriggerError(drama, config);
    const beforeTriggerErrorContext = simulator.createTextContext(instanceKey);
    await beforeTriggerError.trigger(beforeTriggerErrorContext);
    expect(beforeTriggerErrorContext.state.trigger_key).toBe(instanceKey);
    expect(beforeTriggerErrorContext.state.current_scene_key).toBeUndefined();
  });
  it('should clear state after resetSceneState', async () => {
    const cacheState = context.state;
    basic.resetSceneState(context);
    expect(context.state.current_scene_type).toBeUndefined();
    expect(context.state.current_scene_key).toBeUndefined();
    expect(context.state.current_scene_trigger_key).toBeUndefined();
    expect(context.state.current_scene_property).toBeUndefined();
    context.setState(cacheState);
  });
  it('should resetSceneState after conclusion', async () => {
    const endMessage = 'Hello conclusion';
    const cacheState = context.state;
    await basic.conclusion(context, endMessage);
    expect(context.replyText).toBeCalledWith(endMessage);
    expect(context.state.current_scene_type).toBeUndefined();
    context.setState(cacheState);
  });
  it('should jump to next scene when postback data next_scene is set', async () => {
    const nextSceneKey = 'NEXT_SCENE_KEY';
    const nextSceneContext = simulator.createContext({
      event: simulator.createEvent({
        isPostback: true,
        postback: {
          data: `next_scene=${nextSceneKey}`,
        },
      }),
    });
    await basic.callback(nextSceneContext);
    expect(drama.trigScene).toBeCalledWith(
                                    nextSceneContext,
                                    nextSceneKey,
                                    undefined,
                                    undefined);
  });
  it('should use key as trigger_key when force trigger', async () => {
    const forceTriggerKey = 'CALLBACK_SCENE';
    const forceTriggerconfig = {
      key: forceTriggerKey,
      trigger_type: 'hello',
      property: {},
    };
    const forceTrigger = new Basic(drama, forceTriggerconfig);
    const forceTriggerContext = simulator.createTextContext('force_trigger');
    await forceTrigger.trigger(forceTriggerContext);
    expect(forceTriggerContext.state.trigger_key).toBe(forceTriggerKey);
  });
  
  // it('should support image trigger', async () => {
  //   expect().toBeDefined();
  // });
});

describe('Multicast feature', async () => {
  const key = 'MULTICAST_SCENE';
  const message = 'Hello World from multicast';
  const description = 'Hello World from multicast(description)';
  const config = {
    key,
    property: {
      title: message,
      description: () => (description),
      user_id: async (inContext) => (
        Promise.resolve(`Hi ${inContext.session.user.id}`)
      ),
    },
  };
  const basic = new Basic(drama, config);
  it('should prepare property by trigger user context', async () => {
    const userIdList = ['USER1', 'USER2'];
    drama.client.multicast.mockClear();
    const multicastContext = simulator.createTextContext(key);
    await basic.multicast(multicastContext, {}, userIdList);
    expect(drama.client.multicast).toBeCalledWith(userIdList);
  });
  it('should chunk user id list to 100 item', async () => {
    const userIdList = _(320).range()
                              .map((i) => (`USER${i}`))
                              .value();
    drama.client.multicast.mockClear();
    const multicastContext = simulator.createTextContext(key);
    await basic.multicast(multicastContext, {}, userIdList);
    expect(drama.client.multicast).toHaveBeenCalledTimes(4);
  });
});

describe('Callback feature', async () => {
  const key = 'CALLBACK_SCENE';
  const config = {
    key,
    property: {},
  };
  it('should bind postback callback', async () => {
    const basic = new Basic(drama, config, 'postback');
    expect(drama.handler.onPostback).toBeCalled();
  });
  it('should bind postback callback', async () => {
    const basic = new Basic(drama, config, 'text');
    expect(drama.handler.onText).toBeCalled();
  });
});

describe('Generate action', async () => {
  const key = 'SCENE_FOR_TEST';
  const config = {
    key,
    property: {},
  };
  const basic = new Basic(drama, config);
  it('should return default message action', async () => {
    const result = basic.generateAction({});
    expect(result).toEqual({
      type: 'message',
      label: 'Title not set',
      text: 'Message not set',
    });
  });
  it('should retun uri action when message is URL', async () => {
    const title = 'MyBigDay';
    const url = 'http://www.mybigday.com.tw';
    const result = basic.generateAction({
      message: url,
      title,
    });
    expect(result).toEqual({
      type: 'uri',
      label: title,
      uri: url,
    });
  });
  it('should have sceneParams generate by key', async () => {
    expect(basic.sceneParams).toBe(`current_scene_key=${key}`);
  });
  it('should return jump scene action', async () => {
    const sceneId = 'NEXT_SCENE';
    const result = basic.generateAction({
      scene: sceneId,
    });
    expect(result.type).toBe('postback');
    const context = simulator.createContext({
      event: simulator.createEvent({
        isPostback: true,
        postback: {
          data: result.data,
        },
      }),
    });
    const paramsData = basic.depackageSceneParams(context);
    expect(paramsData).toEqual({
      current_scene_key: key,
      next_scene: sceneId,
    });
  });
  it('should generate postback when key is set', async () => {
    const actionKey = 'SOME_KEY';
    const result = basic.generateAction({
      key: actionKey,
    });
    expect(result.type).toBe('postback');
    const context = simulator.createContext({
      event: simulator.createEvent({
        isPostback: true,
        postback: {
          data: result.data,
        },
      }),
    });
    const paramsData = basic.depackageSceneParams(context);
    expect(paramsData).toEqual({
      current_scene_key: key,
      postback_data: actionKey,
    });
  });
});
