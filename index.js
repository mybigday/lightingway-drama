const _ = require('lodash');
const {
  LineHandler,
  MessengerHandler,
} = require('bottender');
const SceneMap = require('./scenes');

const HandlerMap = {
  LineBot: LineHandler,
  MessengerBot: MessengerHandler,
};

class Drama {
  constructor(property = {}) {
    if (property.bot) {
      this.sceneInstanceMap = {};
      this.bot = property.bot;
      this.bot_type = this.bot.constructor.name;
      this.generateHandler();
    } else {
      throw new Error('property.bot not defined: Must set one bottender bot.');
    }
  }
  get client() {
    return this.bot.connector.client;
  }
  generateHandler() {
    const Handler = HandlerMap[this.bot.constructor.name];
    if (Handler) {
      this.handler = new Handler();
      this.bot.onEvent(this.handler);
    } else {
      throw new Error(`Currentlly only supported ${_.keys(HandlerMap)} bot.`);
    }
  }
  addScene(key, sceneConfig) {
    const Scene = SceneMap[sceneConfig.type];
    if (Scene) {
      const scene = new Scene(this, _.defaults({
        key,
      }, sceneConfig));
      this.sceneInstanceMap[key] = scene;
    } else {
      throw new Error(`Scene type ${sceneConfig.type} not exist.`);
    }
  }
  async trigScene(context, key, data, userListOrAll) {
    const scene = _.get(this.sceneInstanceMap, key);
    if (scene) {
      if (userListOrAll && scene.multicast) {
        await scene.multicast(context, data, userListOrAll);
      } else {
        await scene.trigger(context, data);
      }
    } else {
      // console.log('Scene not found');
    }
  }
}

module.exports = Drama;
