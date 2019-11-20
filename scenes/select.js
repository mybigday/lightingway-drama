/*
  # Property
  selectForm: ['basic', 'two-dimensional', 'carousel']
  arrangement: ['list', 'grid']
  headerImageUrl: 'URL'
  title: 'String'
  text: 'String'
  selection_list: Can contain subproperty whith same property structor
*/

const _ = require('lodash');
const Scene = require('./basic');
const fs = require('fs');
const path = require('path');
const gm = require('gm');

const TYPE = 'BOT_SELECT';
const SUBSELECT_KEY = 'SUBSELECT';
const SUBSELECT_REG_EXP = new RegExp(`^${SUBSELECT_KEY}`);
const SEPARATE_SUBSELECT_EXP = /\[\d+\]/g;

class Select extends Scene {
  constructor(drama, config) {
    super(drama, config, 'postback');
    this.sceneType = TYPE;
    this.imageFolder = path.join(drama.mediaFolder, config.key);
    this.generateImageMap('', config.property);
  }
  async generateParameter(context, property) {
    let currentStage = '';
    if (
      _.get(context, 'state.trigger.force_reset') !== true &&
      _.get(context, 'state.last_scene.key') === this.key
    ) {
      currentStage = _.get(context, 'state.current_scene.runtime_data.select_stage') || '';
    }
    let currentProperty = property;
    if (_.isString(currentStage) && currentStage !== '') {
      const currentStageList = currentStage.match(SEPARATE_SUBSELECT_EXP);
      const currentPropertyPath = `selection_list.${_.join(currentStageList, '.selection_list.')}`;
      currentProperty = _.get(property, currentPropertyPath);
    }

    const parameter = [];
    // Must replace text
    parameter.push(currentProperty.text || 'Text not set');
    switch (currentProperty.selectForm) {
      case 'basic': {
        switch (this.botType) {
          case 'LineBot': {
            if (currentProperty.selection_list.length <= 4) {
              parameter.push(
                _.omitBy({
                  thumbnailImageUrl: currentProperty.headerImageUrl,
                  title: currentProperty.title,
                  text: currentProperty.text || 'Text not set',
                  actions: _(currentProperty.selection_list).map((selection, index) => (
                    (_.isArray(selection.selection_list) && selection.selection_list.length > 0) ?
                    _.defaults({
                      key: this.generateSelectionKey(currentStage, index),
                    }, selection)
                    :
                    selection
                  )).map(this.generateAction.bind(this))
                  .take(4)
                  .value(),
                }, _.isUndefined)
              );
            } else if (currentProperty.selection_list.length <= 24) {
              // Must check already gen image
              // context.replyImagemap('this is an imagemap', {
              //   baseUrl: 'https://example.com/bot/images/rm001',
              //   baseSize: {
              //     width: 1040,
              //     height: 1040,
              //   },
              //   actions: [
              //     {
              //       type: 'uri',
              //       linkUri: 'https://example.com/',
              //       area: {
              //         x: 0,
              //         y: 0,
              //         width: 520,
              //         height: 1040,
              //       },
              //     },
              //     {
              //       type: 'message',
              //       text: 'hello',
              //       area: {
              //         x: 520,
              //         y: 0,
              //         width: 520,
              //         height: 1040,
              //       },
              //     },
              //   ],
              // });
            }
            break;
          }
          case 'MessengerBot': {
            if (currentProperty.selection_list.length <= 4) {
              // 一般型範本
            } else if (currentProperty.selection_list.length <= 11) {
              // 11 Quick reply
            }
            
            break;
          }
        }
        break;
      }
      case 'carousel': {
        parameter.push(
          _(currentProperty.selection_list).map((selection, index) => ({
            imageUrl: selection.imageUrl,
            action: this.generateAction(_.defaults(
              (_.isArray(selection.selection_list) && selection.selection_list.length > 0) && {
                key: this.generateSelectionKey(currentStage, index),
              },
              selection
            )),
          }))
          .take(10)
          .value()
        );
        break;
      }
      case 'two-dimensional':
        // FB: 一般型範本 10x3
        parameter.push(
          _(currentProperty.selection_list).map((selection, index) => ({
            thumbnailImageUrl: selection.headerImageUrl,
            title: selection.title,
            text: selection.text || 'Text not set',
            actions: _(selection.selection_list).map((subSelection, subIndex) => (
              (_.isArray(subSelection.selection_list) && subSelection.selection_list.length > 0) ?
              _.defaults({
                key: this.generateSelectionKey(currentStage, index, subIndex),
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
    }
    return Promise.resolve(parameter);
  }
  generateSelectionKey(currentStage, index, subIndex) {
    let result = `${SUBSELECT_KEY}${currentStage}[${index}]`;
    if (subIndex) {
      result = `${result}[subIndex]`;
    }
    // result = result.replace(`${SUBSELECT_KEY}.`, SUBSELECT_KEY);
    return result;
  }
  async generateImageMap(currentStage, props) {
    const property = _.defaults(props, {
      colorList: [{
        backgroundColor: '#333333',
        fontColor: '#CCCCCC',
      }, {
        backgroundColor: '#555555',
        fontColor: '#CCCCCC',
      }],
      arrangement: 'list',
    });
    if (!fs.existsSync(this.imageFolder)) {
      fs.mkdirSync(this.imageFolder);
    }

    if (_.isArray(property.selection_list)) {
      const quantity = property.selection_list.length;
      if (quantity > 0 && quantity <= 24) {
        const width = 1040;
        let height = 1040;
        let itemPerLine = 1;
        if (property.arrangement === 'grid') {
          if (quantity <= 4) {
            itemPerLine = 2;
          } else if (quantity <= 6) {
            itemPerLine = 2;
            height = (width / 2) * 3;
          } else if (quantity <= 9) {
            itemPerLine = 3;
          } else if (quantity <= 12) {
            itemPerLine = 3;
            height = (width / 3) * 4;
          } else if (quantity <= 16) {
            itemPerLine = 4;
          } else if (quantity <= 20) {
            itemPerLine = 4;
            height = (width / 4) * 5;
          } else if (quantity <= 24) {
            itemPerLine = 4;
            height = (width / 2) * 3;
          }
        } else {
          if (quantity > 10) {
            height = (width / 2) * 3;
          }
        }
        const image = gm(width, height, property.colorList[0].backgroundColor)
                          // .fill(property.fontColor)
                          // .stroke(property.fontColor, 3)
                          .font(path.join(__dirname, '..', 'font.ttf'));
        const itemWidth = width / itemPerLine;
        const itemHeight = height / _.ceil(quantity / itemPerLine);
        let count = 0;
        _.each(property.selection_list, (selection, index) => {
          const x = index % itemPerLine;
          const y = _.floor(index / itemPerLine);
          const x0 = x * itemWidth;
          const x1 = x0 + itemWidth;
          const y0 = y * itemHeight;
          const y1 = y0 + itemHeight;
          const fontSize = Math.min(itemHeight * 0.7, itemWidth / (selection.title.length + 2));
          const offsetX = (width + itemWidth) / 2;
          const offsetY = (height + itemHeight) / 2;

          const color = _.nth(property.colorList, index % property.colorList.length);

          image
          .fill(color.backgroundColor)
          .drawRectangle(x0, y0, x1, y1)
          .fill(color.fontColor)
          .fontSize(`${fontSize}px`)
          // .drawText(x0, y1, selection.title, 'Center');
          .drawText(itemWidth * (x + 1) - offsetX, itemHeight * (y + 1) - offsetY, selection.title, 'Center');
          // .drawText(0, itemHeight * (index + 1) - offset, action.title, 'Center')
          count = (count + 1) % property.selection_list.length;

          if (_.isArray(selection.selection_list)) {
            this.generateImageMap(`${currentStage}[${index}]`, props);
          }
        });
        await this.saveImageFile(image, currentStage);
      } else {
        throw new Error('Select must have at lease one selection and small then 24 items.');
      }
    } else {
      throw new Error('Not support dynamic property when use imagemap select.');
    }




    // grid
    // 2 x 2: 1-4
    // 2 x 3: 5-6
    // 3 x 3: 7-9
    // 3 x 4: 10-12
    // 4 x 4: 13-16
    // 4 x 5: 17-20
    // 4 x 6: 21-24
    // list
    // 1 x 1: 1-10
    // 1 x 1.5: 11-24
    // 240px, 300px, 460px, 700px, 1040px
  }
  async saveImageFile(image, currentStage) {
    return new Promise((resolve, reject) => {
      const resizeImage = async (filePath, width) => (
        new Promise((resolve2, reject2) => {
          const imageFilePath = path.join(path.dirname(filePath), `${width}.png`);
          gm(filePath).resize(width).write(imageFilePath, (err) => {
            if (err) {
              return reject2(err);
            }
            return resolve2();
          });
        })
      );
      const imageFilePath = path.join(this.imageFolder, currentStage, '1040.png');
      image.write(imageFilePath, async (err) => {
        if (err) {
          return reject(err);
        }
        await resizeImage(imageFilePath, 700);
        await resizeImage(imageFilePath, 460);
        await resizeImage(imageFilePath, 300);
        await resizeImage(imageFilePath, 240);
        return resolve();
      });
    });
  }
  async getTriggerHandler(context, property) {
    switch (property.selectForm) {
      case 'image':
        return Promise.resolve('replyImagemap');
      case 'carousel':
        return Promise.resolve('replyImageCarouselTemplate');
      case 'two-dimensional':
        return Promise.resolve('replyCarouselTemplate');
      default:
        return Promise.resolve('replyButtonTemplate');
    }
  }
  async getMulticastHandler(context, property) {
    switch (property.selectForm) {
      case 'image':
        return Promise.resolve('multicastImagemap');
      case 'carousel':
        return Promise.resolve('multicastImageCarouselTemplate');
      case 'two-dimensional':
        return Promise.resolve('multicastCarouselTemplate');
      default:
        return Promise.resolve('multicastButtonTemplate');
    }
  }
  async callback(context) {
    if (!super.callback(context)) {
      const paramsData = this.depackageSceneParams(context);
      let result = paramsData.postback_data || 'Recived selection';
      if (SUBSELECT_REG_EXP.test(result)) {
        this.setRuntimeData(context, {
          select_stage: result.replace(SUBSELECT_KEY, ''),
        });
        return await this.conclusion(context, {
          nextSceneId: this.key,
        });
      }
      const onSelectedHandler = this.config.onSelected;
      if (onSelectedHandler) {
        result = await onSelectedHandler(context, result);
      }
      return await this.conclusion(context, result);
    }
    return false;
  }
}
Select.type = TYPE;

module.exports = Select;
