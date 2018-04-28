const Promise = require('bluebird');
const _ = require('lodash');
const isAsyncFunction = require('is-async-function');
const { URL } = require('url');

const TYPE = 'BOT_BASIC';
const URL_TEST = /^((\w){3,20})(:\/\/){1}/;

class Basic {
  constructor(drama, config, callbackType) {
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
    switch (this.config.trigger_type) {
      case 'text': {
        handler.onText(this.config.predicate, this.trigger.bind(this));
        break;
      }
      default:
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
        if (_.isFunction(value)) {
          if (isAsyncFunction(value)) {
            return await value(context);
          }
          return Promise.resolve(value(context));
        }
        return Promise.resolve(value);
      })
    );
  }
  async generateParameter(context, property) {
    return [];
  }
  async getTriggerHandler(context) {
    return Promise.resolve('reply');
  }
  async getMulticastHandler(context) {
    return Promise.resolve('multicast');
  }
  async beforeTrigger(context, property) {
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
      trigger_key: triggerKey,
    });

    let property = _.defaults(data, this.config.property, {});
    property = await this.replaceDynamicProperty(context, property);

    const result = await this.beforeTrigger(context, property);
    if (result === true) {
      context.setState({
        current_scene_type: this.sceneType,
        current_scene_key: this.key,
        current_scene_property: property,
        last_scene_key: (/^MENU_/.test(triggerKey)) ? '' : (context.state.current_scene_key || ''),
      });
      const parameter = await this.generateParameter(context, property);
      const triggerHandler = await this.getTriggerHandler(context);
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
      const multicastHandler = await this.getMulticastHandler(context);
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
    // TODO: If type is message must check test is set
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
      /^LW_/.test(value) !== true &&
      _.get(context, 'state.current_scene_type') === this.sceneType &&
      _.get(context, 'state.current_scene_key') === this.key
    ) {
      return true;
    }
    return false;
  }
  resetSceneState(context) {
    context.setState({
      current_scene_type: undefined,
      current_scene_key: undefined,
      current_scene_trigger_key: undefined,
      current_scene_property: undefined,
    });
  }
  async callback(context) {
    if (context.event.isPostback) {
      const paramsData = this.depackageSceneParams(context);
      if (_.isString(paramsData.next_scene) && paramsData.next_scene !== '') {
        return await this.conclusion(context, {
          nextSceneId: paramsData.next_scene,
        });
      }
    }
  }
  async conclusion(context, result) {
    this.resetSceneState(context);
    if (_.isString(result) && result !== '') {
      return await context.replyText(result);
    } else if (result.nextSceneId) {
      return await this.trigScene(context, result.nextSceneId, result.data, result.userListOrAll);
    }
  }
}
Basic.type = TYPE;

module.exports = Basic;
