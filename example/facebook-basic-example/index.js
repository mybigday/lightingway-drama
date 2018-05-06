const { MessengerBot } = require('bottender');
const { createServer } = require('bottender/express');
const greenlock = require('greenlock-express');
const Drama = require('../../index');

if (
  process.env.MESSENGER_ACCESS_TOKEN &&
  process.env.MESSENGER_APP_SECRET &&
  process.env.MESSENGER_VERIFY_TOKEN
) {
  const bot = new MessengerBot({
    accessToken: process.env.MESSENGER_ACCESS_TOKEN,
    appSecret: process.env.MESSENGER_APP_SECRET,
  });

  const drama = new Drama({
    bot,
  });

  drama.addScene('TEST_KEY', {
    type: 'BOT_REPLY',
    trigger_type: 'text',
    predicate: 'hello',
    property: {
      type: 'text',
      text: 'World',
    },
  });

  const server = createServer(bot, {
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN,
  });

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
  console.log('Please export MESSENGER_ACCESS_TOKEN, MESSENGER_APP_SECRET and MESSENGER_VERIFY_TOKEN first.');
}
