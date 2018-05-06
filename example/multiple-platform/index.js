const _ = require('lodash');
const bodyParser = require('body-parser');
const express = require('express');
const { MessengerBot, LineBot } = require('bottender');
const { registerRoutes } = require('bottender/express');
const greenlock = require('greenlock-express');
const Drama = require('../../index');

if (
  process.env.MESSENGER_ACCESS_TOKEN &&
  process.env.MESSENGER_APP_SECRET &&
  process.env.MESSENGER_VERIFY_TOKEN &&
  process.env.LINE_ACCESS_TOKEN &&
  process.env.LINE_CHANNEL_SECRET
) {
  const messengerBot = new MessengerBot({
    accessToken: process.env.MESSENGER_ACCESS_TOKEN,
    appSecret: process.env.MESSENGER_APP_SECRET,
  });
  const lineBot = new LineBot({
    accessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  });

  const messengerDrama = new Drama({
    bot: messengerBot,
  });
  const lineDrama = new Drama({
    bot: lineBot,
  });

  const config = {
    TEST_KEY_DEMO1: {
      type: 'BOT_REPLY',
      trigger_type: 'text',
      predicate: 'demo1',
      property: {
        type: 'text',
        text: 'World',
      },
    },
    TEST_KEY_DEMO2: {
      type: 'BOT_REPLY',
      trigger_type: 'text',
      predicate: 'demo2',
      property: {
        type: 'image',
      },
    },
    TEST_KEY_DEMO3: {
      type: 'BOT_REPLY',
      trigger_type: 'text',
      predicate: 'demo3',
      property: {
        type: 'video',
      },
    },
    TEST_KEY_DEMO4: {
      type: 'BOT_REPLY',
      trigger_type: 'text',
      predicate: 'demo4',
      property: {
        type: 'audio',
      },
    },
  };

  _(config).each((value, key) => {
    messengerDrama.addScene(key, value);
    lineDrama.addScene(key, value);
  });

  const server = express();

  server.use(
    bodyParser.json({
      verify: (req, res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  registerRoutes(server, messengerBot, {
    path: '/messenger',
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN,
  });
  registerRoutes(server, lineBot, { path: '/line' });

  if (
    process.env.OWNER_EMAIL &&
    process.env.SITE_URL
  ) {
    greenlock.create({
      server: 'https://acme-v01.api.letsencrypt.org/directory',
      email: process.env.OWNER_EMAIL,
      agreeTos: true,
      approveDomains: [process.env.SITE_URL],
      app: server,
    }).listen(80, 443);
  } else {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
      console.log(`App listening on port ${PORT}`);
      console.log('Press Ctrl+C to quit.');
    });
  }
} else {
  console.log('Please export LINE_ACCESS_TOKEN LINE_CHANNEL_SECRET MESSENGER_ACCESS_TOKEN, MESSENGER_APP_SECRET and MESSENGER_VERIFY_TOKEN first.');
}
