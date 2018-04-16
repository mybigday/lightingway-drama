const _ = require('lodash');
const { Line } = require('messaging-api-line');
const Basic = require('./basic');

const TYPE = 'BOT_REPLY';

class Reply extends Basic {
  constructor(drama, config) {
    super(drama, config);
    this.sceneType = TYPE;
  }
  generateMessage(message) {
    switch (message.type) {
      case 'text': {
        return Line.createText(message.text || 'Text not set');
      }
      case 'image': {
        const defaultUrl = 'https://goo.gl/dKUVh4';
        const imageUrl = message.image_url || defaultUrl;
        const previewUrl = message.preview_image_url || imageUrl;
        return Line.createImage(imageUrl, previewUrl);
      }
      case 'video': {
        const defaultVideoUrl = 'https://goo.gl/W9zf6r';
        const defaultPreviewImageUrl = 'https://goo.gl/cjf6QY';
        const videoUrl = message.video_url || defaultVideoUrl;
        const previewUrl = message.preview_image_url || defaultPreviewImageUrl;
        return Line.createVideo(videoUrl, previewUrl);
      }
      case 'audio': {
        const defaultAudioUrl = 'https://goo.gl/VbuV79';
        const defaultDuration = 4000;
        const audioUrl = message.audio_url || defaultAudioUrl;
        const duration = message.duration || defaultDuration;
        return Line.createAudio(audioUrl, duration);
      }
      case 'location': {
        return Line.createLocation(_.defaults(message, {
          title: 'MyBigDay Cafe',
          address: '台北市中山區中原街 40 號',
          latitude: 25.057524,
          longitude: 121.528775,
        }));
      }
      case 'sticker': {
        const defaultPackageId = '1';
        const defaultStickerId = '3';
        const packageId = message.package_id || defaultPackageId;
        const stickerId = message.sticker_id || defaultStickerId;
        return Line.createSticker(packageId, stickerId);
      }
      case 'confirm': {
        const text = message.text || 'Text not set';
        const buttonList = [{
          type: 'message',
          label: message.left_button_title || '是',
          text: message.left_button_message || 'Yes',
        }, {
          type: 'message',
          label: message.right_button_title || '否',
          text: message.right_button_message || 'No',
        }];
        return Line.createConfirmTemplate(text, {
          text,
          actions: buttonList,
        });
      }
      default: {
        return Line.createText(`Unknow message type: ${message.type}`);
      }
    }
  }
  async generateParameter(context, property) {
    const parameter = [];
    if (_.isArray(property.message_list)) {
      parameter.push(
        _.map(property.message_list, this.generateMessage)
      );
    } else {
      parameter.push([this.generateMessage(property)]);
    }
    return Promise.resolve(parameter);
  }
  get triggerHandler() {
    return 'reply';
  }
  get multicastHandler() {
    return 'multicast';
  }
}
Reply.type = TYPE;

module.exports = Reply;
