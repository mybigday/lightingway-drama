const moduleList = [
  // require('./input'),
  require('./reply'),
  // require('./select'),
  // require('./confirm'),
  // require('./question'),
  // require('./datetime'),
];

module.exports = moduleList.reduce((result, moduleObject) => (
  Object.assign({}, result, {
    [moduleObject.type]: moduleObject,
  })
), {});
