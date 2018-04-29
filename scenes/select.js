const _ = require('lodash');
const Scene = require('./basic');

const TYPE = 'BOT_SELECT';
const SUBSELECT_KEY = 'SUBSELECT';
const SUBSELECT_REG_EXP = new RegExp(`^${SUBSELECT_KEY}`);

class Select extends Scene {
  constructor(sceneControl, handler, key, config) {
    super(sceneControl, handler, key, config, 'postback');
    this.sceneType = TYPE;
  }
  async generateParameter(context, property) {
    let currentStage = '';
    if (context.state.last_scene_key === this.key) {
      currentStage = _.get(context, 'state.select_stage') || '';
    }
    let currentProperty = property;
    if (_.isString(currentStage) && currentStage !== '') {
      currentProperty = _.get(property, currentStage);
    }

    const parameter = [];
    // Must replace text
    parameter.push(currentProperty.text || 'Text not set');
    switch (currentProperty.selectForm) {
      case 'image': {
        parameter.push(
          _(currentProperty.selection_list).map((selection, index) => ({
            imageUrl: selection.imageUrl,
            action: this.generateAction(_.defaults(
              (_.isArray(selection.selection_list) && selection.selection_list.length > 0) && {
                key: `${SUBSELECT_KEY}${currentStage}.selection_list.[${index}]`
                      .replace(`${SUBSELECT_KEY}.`, SUBSELECT_KEY),
              },
              selection
            )),
          }))
          .take(4)
          .value()
        );
        break;
      }
      case 'two-dimensional':
        parameter.push(
          _(currentProperty.selection_list).map((selection, index) => ({
            thumbnailImageUrl: selection.headerImageUrl,
            title: selection.title,
            text: selection.text || 'Text not set',
            actions: _(selection.selection_list).map((subSelection, subIndex) => (
              (_.isArray(subSelection.selection_list) && subSelection.selection_list.length > 0) ?
              _.defaults({
                key: `${SUBSELECT_KEY}${currentStage}.selection_list.[${index}].selection_list.[${subIndex}]`
                      .replace(`${SUBSELECT_KEY}.`, SUBSELECT_KEY),
              }, subSelection)
              :
              subSelection
            ))
            .map(this.generateAction.bind(this))
            .take(3)
            .value(),
          }))
          .take(10)
          .value()
        );
        break;
      // Must map selectionList key as SUBSELECT[0][1][2]
      default: {
        parameter.push(
          _.omitBy({
            thumbnailImageUrl: currentProperty.headerImageUrl,
            title: currentProperty.title,
            text: currentProperty.text || 'Text not set',
            actions: _(currentProperty.selection_list).map((selection, index) => (
              (_.isArray(selection.selection_list) && selection.selection_list.length > 0) ?
              _.defaults({
                key: `${SUBSELECT_KEY}${currentStage}.selection_list.[${index}]`
                      .replace(`${SUBSELECT_KEY}.`, SUBSELECT_KEY),
              }, selection)
              :
              selection
            )).map(this.generateAction.bind(this))
            .take(4)
            .value(),
          }, _.isUndefined)
        );
      }
    }
    console.log('parameter: ', JSON.stringify(parameter));
    return Promise.resolve(parameter);
  }
  async getTriggerHandler(context, property) {
    let sendHandler = 'replyButtonTemplate';
    switch (property.selectForm) {
      case 'image': {
        sendHandler = 'replyImageCarouselTemplate';
        break;
      }
      case 'two-dimensional': {
        sendHandler = 'replyCarouselTemplate';
        break;
      }
    }
    return Promise.resolve(sendHandler);
  }
  async getMulticastHandler(context, property) {
    let sendHandler = 'multicastButtonTemplate';
    switch (property.selectForm) {
      case 'image': {
        sendHandler = 'multicastImageCarouselTemplate';
        break;
      }
      case 'two-dimensional': {
        sendHandler = 'multicastCarouselTemplate';
        break;
      }
    }
    return Promise.resolve(sendHandler);
  }
  resetSceneState(context) {
    super.resetSceneState(context);
    context.setState({
      select_stage: undefined,
    });
  }
  async callback(context) {
    const paramsData = this.depackageSceneParams(context);
    // TODO: Must move nextScene action to basic
    if (_.isString(paramsData.next_scene) && paramsData.next_scene !== '') {
      this.resetSceneState(context);
      return await this.conclusion(context, {
        nextSceneId: paramsData.next_scene,
      });
    }
    if (_.isString(paramsData.postback_data) && SUBSELECT_REG_EXP.test(paramsData.postback_data)) {
      context.setState({
        select_stage: paramsData.postback_data.replace(SUBSELECT_KEY, ''),
      });
      return await this.conclusion(context, {
        nextSceneId: this.key,
      });
    }
    let result = 'Recived selection';
    if (_.isString(paramsData.postback_data) && paramsData.postback_data !== '') {
      result = paramsData.postback_data;
    }
    const onSelectedHandler = this.config.onSelected;
    if (onSelectedHandler) {
      result = await onSelectedHandler(context, result);
    }
    this.resetSceneState(context);
    return await this.conclusion(context, result);
  }
}
Select.type = TYPE;

module.exports = Select;
