// eslint-disable-next-line import/no-unassigned-import
import optionsStorage from './options-storage.js';

const extensionHost = typeof (chrome) === 'object' ? chrome : browser;
const { runtime } = extensionHost;

const initPost = body => ({ method: 'post', headers: {}, body: JSON.stringify(body) })

runtime.onMessage.addListener(data => {
  optionsStorage.getAll().then(({ flakeReportURL }) => {
    console.log('FETCH:', flakeReportURL, data);
    fetch(flakeReportURL, initPost(data)).then(() => {
      console.log('Posted!');
    })
  })
});
