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
        switch (this.botType) {
          case 'LineBot': return Line.createText(message.text || 'Text not set');
          case 'MessengerBot': return message.text;
        }
        break;
      }
      case 'image': {
        const defaultUrl = 'https://goo.gl/dKUVh4';
        const imageUrl = message.image_url || defaultUrl;
        const previewUrl = message.preview_image_url || imageUrl;
        switch (this.botType) {
          case 'LineBot': return Line.createImage(imageUrl, previewUrl);
          case 'MessengerBot': return imageUrl;
        }
        break;
      }
      case 'video': {
        const defaultVideoUrl = 'http://www.html5videoplayer.net/videos/toystory.mp4';
        const defaultPreviewImageUrl = 'https://goo.gl/cjf6QY';
        const videoUrl = message.video_url || defaultVideoUrl;
        const previewUrl = message.preview_image_url || defaultPreviewImageUrl;
        switch (this.botType) {
          case 'LineBot': return Line.createVideo(videoUrl, previewUrl);
          case 'MessengerBot': return videoUrl;
        }
        break;
      }
      case 'audio': {
        const defaultAudioUrl = 'https://goo.gl/VbuV79';
        const defaultDuration = 4000;
        const audioUrl = message.audio_url || defaultAudioUrl;
        const duration = message.duration || defaultDuration;
        switch (this.botType) {
          case 'LineBot': return Line.createAudio(audioUrl, duration);
          case 'MessengerBot': return audioUrl;
        }
        break;
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
      case 'select': {
        const thumbnailImageUrl = message.headerImageUrl;
        const title = message.title;
        const text = message.text || 'Text not set';
        const buttonList = _(message.buttonList || [{}]).take(4).map((button) => ({
          type: 'message',
          label: button.title || '尚未設定標題',
          text: button.message || 'UNDEFINED_MESSAGE',
        }))
        .value();
        return Line.createButtonTemplate(text, _.omitBy({
          thumbnailImageUrl,
          text,
          title,
          actions: buttonList,
        }, _.isUndefined));
      }
    }
    const errorMessage = `Unknow message type: ${message.type}`;
    switch (this.botType) {
      case 'LineBot': return Line.createText(errorMessage);
      case 'MessengerBot': return errorMessage;
    }
  }
  async generateParameter(context, property) {
    const parameter = [];
    if (this.botType === 'LineBot') {
      if (_.isArray(property.message_list)) {
        parameter.push(
          _.map(property.message_list, this.generateMessage.bind(this))
        );
      } else {
        parameter.push([this.generateMessage(property)]);
      }
    } else if (this.botType === 'MessengerBot') {
      if (_.isArray(property.message_list)) {
        throw new Error('MessengerBot only support one message');
      }
      parameter.push(this.generateMessage(property));
    }
    return Promise.resolve(parameter);
  }
  async getTriggerHandler(context, property) {
    if (this.botType === 'LineBot') {
      return Promise.resolve('reply');
    }
    switch (property.type) {
      case 'text': return Promise.resolve('sendText');
      case 'image': return Promise.resolve('sendImage');
      case 'video': return Promise.resolve('sendVideo');
      case 'audio': return Promise.resolve('sendAudio');
    }
    return Promise.resolve('reply');
  }
}
Reply.type = TYPE;

module.exports = Reply;
