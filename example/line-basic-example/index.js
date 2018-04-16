const { LineBot } = require('bottender');
const { createServer } = require('bottender/express');
const greenlock = require('greenlock-express');
const Drama = require('../../index');

if (
  process.env.LINE_ACCESS_TOKEN &&
  process.env.LINE_CHANNEL_SECRET
) {
  const bot = new LineBot({
    accessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
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

  const server = createServer(bot);

  if (
    process.env.OWNER_EMAIL &&
    process.env.SITE_URL
  ) {
    greenlock.create({
      server: 'https://acme-v01.api.letsencrypt.org/directory',
      email: 'pepper.yen@gmail.com',
      agreeTos: process.env.OWNER_EMAIL,
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
  console.log('Please export LINE_ACCESS_TOKEN and LINE_CHANNEL_SECRET first.');
}
