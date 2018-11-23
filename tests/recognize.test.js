const { TesseractWorker, utils: { loadLang } } = Tesseract;

const IMAGE_PATH = 'http://localhost:3000/tests/assets/images';
const SIMPLE_TEXT = 'Tesseract.js\n';
const COMSIC_TEXT = 'HellO World\nfrom beyond\nthe Cosmic Void\n';
const TESTOCR_TEXT = 'This is a lot of 12 point text to test the\nocr code and see if it works on all types\nof file format.\n\nThe quick brown dog jumped over the\nlazy fox. The quick brown dog jumped\nover the lazy fox. The quick brown dog\njumped over the lazy fox. The quick\nbrown dog jumped over the lazy fox.\n';
const CHINESE_TEXT = '繁 體 中 文 測 試\n';

const loadLangOptions = {
  langPath: 'http://localhost:3000/tests/assets/traineddata',
  cachePath: './tests/assets/traineddata',
};

const getWorker = options => (
  new TesseractWorker({
    cacheMethod: 'readOnly',
    ...loadLangOptions,
    ...options,
  })
);

before(function cb(done) {
  this.timeout(30000);
  const load = () => (
    loadLang({
      langs: 'eng+chi_tra',
      cacheMethod: 'write',
      langURI: loadLangOptions.langPath,
      ...loadLangOptions,
    }).then(() => {
      done();
    })
  );
  if (typeof startServer !== 'undefined') {
    startServer(load);
  } else {
    load();
  }
});

after((done) => {
  if (typeof stopServer !== 'undefined') {
    stopServer(done);
  } else {
    done();
  }
});

describe('recognize()', () => {
  describe('should recognize different langs', () => {
    [
      { name: 'chinese.png', lang: 'chi_tra', ans: CHINESE_TEXT },
    ].forEach(({ name, lang, ans }) => (
      it(`recongize ${lang}`, (done) => {
        const worker = getWorker();
        worker
          .recognize(`${IMAGE_PATH}/${name}`, lang)
          .then(({ text }) => {
            expect(text).to.be(ans);
            worker.terminate();
            done();
          });
      }).timeout(30000)
    ));
  });

  describe('should read bmp, jpg, png and pbm format images', () => {
    ['bmp', 'jpg', 'png', 'pbm'].forEach(format => (
      it(`support ${format} format`, (done) => {
        const worker = getWorker();
        worker
          .recognize(`${IMAGE_PATH}/simple.${format}`)
          .then(({ text }) => {
            expect(text).to.be(SIMPLE_TEXT);
            worker.terminate();
            done();
          });
      }).timeout(10000)
    ));
  });

  describe('should be able to recognize multiple images with 1 worker', () => {
    [3, 10, 20].forEach(num => (
      it(`recognize ${num} images with 1 worker`, (done) => {
        const worker = getWorker();
        Promise.all(
          Array(num).fill(0).map(() => worker.recognize(`${IMAGE_PATH}/simple.png`)),
        ).then((results) => {
          results.forEach(({ text }) => {
            expect(text).to.be(SIMPLE_TEXT);
          });
          worker.terminate();
          done();
        });
      }).timeout(30000)
    ));
  });

  describe('should recognize multiple images in order', () => {
    [1, 2].forEach((num) => {
      it(`recognize ${num * 2} images with 1 worker in order`, (done) => {
        const worker = getWorker();
        const cases = Array(num).fill(0)
          .reduce(acc => (
            acc.concat([
              { name: 'simple.png', ans: SIMPLE_TEXT },
              { name: 'cosmic.png', ans: COMSIC_TEXT },
            ])
          ),
          []);
        Promise.all(
          cases.map(({ name }) => worker.recognize(`${IMAGE_PATH}/${name}`)),
        ).then((results) => {
          results.forEach(({ text }, idx) => {
            expect(text).to.be(cases[idx].ans);
          });
          worker.terminate();
          done();
        });
      }).timeout(30000);
    });
  });

  describe('supports different complexity', () => {
    [
      { name: 'simple.png', desc: 'simple', ans: SIMPLE_TEXT },
      { name: 'cosmic.png', desc: 'normal', ans: COMSIC_TEXT },
      { name: 'testocr.png', desc: 'complex', ans: TESTOCR_TEXT },
    ].forEach(({ name, desc, ans }) => (
      it(`recongize ${desc} image`, (done) => {
        const worker = getWorker();
        worker
          .recognize(`${IMAGE_PATH}/${name}`)
          .then(({ text }) => {
            expect(text).to.be(ans);
            worker.terminate();
            done();
          });
      }).timeout(20000)
    ));
  });
});
