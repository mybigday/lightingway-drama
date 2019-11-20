const Promise = require('bluebird');
const _ = require('lodash');
const isAsyncFunction = require('is-async-function');
const { URL } = require('url');

const TYPE = 'BOT_BASIC';
const URL_TEST = /^((\w){3,20})(:\/\/){1}/;
const FORCE_RESET = /^(LW|MENU|RESET)_/;

/*
  state: {
    trigger: {
      key,
      force_reset,
    },
    current_scene: {
      type,
      key,
      property,
      runtime_data,
      reply_queue,
    },
    last_scene: {
      type,
      key,
      property,
      runtime_data,
    },
  }
*/

class Basic {
  constructor(drama, config, callbackType) {
    this.botType = drama.botType;
    this.trigScene = drama.trigScene;
    this.sceneType = TYPE;
    this.key = config.key;
    this.config = config;
    this.callbackType = callbackType;
    this.bindTrigger(drama.handler);
    this.bindCallback(drama.handler);
    this.client = drama.client;
  }
  bindTrigger(handler) {
    this.triggerType = this.config.trigger_type;
    const basicEventHandler = {
      text: handler.onText,
      image: handler.onImage,
      video: handler.onVideo,
      audio: handler.onAudio,
      location: handler.onLocation,
      sticker: handler.onSticker,
      postback: handler.onPostback,
    };
    const lineEventHandler = {
      date: handler.onDate,
      time: handler.onTime,
      datetime: handler.onDatetime,
      follow: handler.onFollow,
      unfollow: handler.onUnfollow,
      join: handler.onJoin,
      leave: handler.onLeave,
      beacon: handler.onBeacon,
    };
    const messengerEventHandler = {
      file: handler.onFile,
      quick_reply: handler.onQuickReply,
    };
    const eventHandler = _.defaults(
      this.botType === 'LineBot' && lineEventHandler,
      this.botType === 'MessengerBot' && messengerEventHandler,
      basicEventHandler,
    )[this.triggerType];
    if (eventHandler) {
      eventHandler(this.config.predicate, this.trigger.bind(this));
    }
  }
  bindCallback(handler) {
    switch (this.callbackType) {
      case 'postback': {
        handler.onPostback(this.filter.bind(this), this.callback.bind(this));
        break;
      }
      case 'text': {
        handler.onText(this.filter.bind(this), this.callback.bind(this));
        break;
      }
      default:
    }
  }
  async replaceDynamicProperty(context, property) {
    return await Promise.props(
      _.mapValues(property, async (value) => {
        let result = value;
        if (_.isFunction(value)) {
          if (isAsyncFunction(value)) {
            result = await value(context);
          } else {
            result = value(context);
          }
        }
        if (_.isObject(result)) {
          const newResult = await this.replaceDynamicProperty(context, result);
          if (_.isArray(result)) {
            result = _.toArray(newResult);
          }
        }
        return Promise.resolve(result);
      })
    );
  }
  async generateReplyQueue(/* context, property */) {
    return [];
  }
  // async generateParameter(/* context, property */) {
  //   return [];
  // }
  // async getTriggerHandler(/* context, property */) {
  //   return Promise.resolve('reply');
  // }
  // async getMulticastHandler(/* context, property */) {
  //   return Promise.resolve('multicast');
  // }
  async beforeTrigger(/* context, property */) {
    return Promise.resolve(true);
  }
  async trigger(context, data) {
    let triggerKey = '';
    switch (this.triggerType) {
      case 'text': {
        triggerKey = _.get(context, 'event.message.text') || '';
        break;
      }
      default: {
        triggerKey = this.key;
      }
    }
    context.setState({
      trigger: {
        key: triggerKey,
        force_reset: FORCE_RESET.test(triggerKey),
      },
    });

    let property = _.defaults(data, this.config.property, {});
    property = await this.replaceDynamicProperty(context, property);

    const result = await this.beforeTrigger(context, property);
    if (result === true) {
      context.setState({
        current_scene: {
          type: this.sceneType,
          key: this.key,
          property,
        },
        last_scene: context.state.current_scene,
      });
      const parameter = await this.generateParameter(context, property);
      const triggerHandler = await this.getTriggerHandler(context, property);
      return await context[triggerHandler](...parameter);
    }
    return await this.conclusion(context, result);
  }
  async multicast(context, data, userIdListOrAll) {
    let property = _.defaults(data, this.config.property, {});
    property = await this.replaceDynamicProperty(context, property);
    const userIdList = _.clone(userIdListOrAll);
    if (userIdListOrAll === true) {
      // TODO: Get all user ID from bank!
      // TODO: Must let dev provide all getAllUser()
    }
    const userIdListChunk = _.chunk(userIdList, 100);
    const parameter = await this.generateParameter(context, property);
    const promiseList = _.each(userIdListChunk, async (userIdChunk) => {
      const multicastHandler = await this.getMulticastHandler(context, property);
      return await this.client[multicastHandler](userIdChunk, ...parameter);
    });
    return Promise.all(promiseList);
  }
  get sceneParams() {
    return `current_scene_key=${this.key}`;
  }
  depackageSceneParams(context) {
    const paramsData = {};
    const fakeurl = new URL(`http://fakeurl.com/?${context.event.postback.data}`);
    fakeurl.searchParams.forEach((param, name) => {
      paramsData[name] = param;
    });
    return paramsData;
  }
  generateAction(parameter) {
    // TODO: If type is message must check text is set
    const result = {
      type: 'message',
      label: parameter.title || 'Title not set',
      text: parameter.message,
      data: parameter.key && `${this.sceneParams}&postback_data=${parameter.key}`,
      displayText: parameter.next,
    };
    if (_.isString(parameter.scene) && parameter.scene !== '') {
      result.type = 'postback';
      result.data = `${this.sceneParams}&next_scene=${parameter.scene}`;
    } else if (parameter.key) {
      result.type = 'postback';
    } else if (URL_TEST.test(parameter.message)) {
      result.type = 'uri';
      result.uri = parameter.message;
      result.text = undefined;
    } else {
      result.text = parameter.message || 'Message not set';
    }
    return _.omitBy(result, _.isUndefined);
  }
  async filter(value, context) {
    if (
      FORCE_RESET.test(value) !== true &&
      _.get(context, 'state.current_scene.type') === this.sceneType &&
      _.get(context, 'state.current_scene.key') === this.key
    ) {
      return true;
    }
    return false;
  }
  resetSceneState(context) {
    context.setState({
      current_scene: undefined,
      last_scene: context.state.current_scene,
    });
  }
  async callback(context) {
    if (context.event.isPostback) {
      const paramsData = this.depackageSceneParams(context);
      if (_.isString(paramsData.next_scene) && paramsData.next_scene !== '') {
        await this.conclusion(context, {
          nextSceneId: paramsData.next_scene,
        });
        return true;
      }
    }
    return false;
  }
  async conclusion(context, result) {
    this.resetSceneState(context);
    if (_.isString(result) && result !== '') {
      await context.replyText(result);
      return true;
    } else if (result.nextSceneId) {
      await this.trigScene(context, result.nextSceneId, result.data, result.userListOrAll);
      return true;
    }
    return false;
  }
  setRuntimeData(context, data) {
    const currentRuntimeData = _.get(context, 'state.current_scene.runtime_data');
    const currentScene = _.get(context, 'state.current_scene');
    const newScene = _.defaults({
      runtime_data: _.defaults(data, currentRuntimeData),
    }, currentScene);
    context.setState({
      current_scene: newScene,
    });
  }
}
Basic.type = TYPE;

module.exports = Basic;
