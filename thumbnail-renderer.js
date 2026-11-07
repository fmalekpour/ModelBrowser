import { makeStage, parseModel, fit, dispose } from './model-engine.js';
let stage;
window.thumbnailWorker.onJob(async ({ jobId, file, settings }) => {
  let model;
  try {
    stage ||= makeStage(null, true, settings);
    model = parseModel(await window.thumbnailWorker.read(file.id), file.type, settings);
    stage.scene.add(model); fit(stage, model, settings.thumbnailView);
    const data = stage.renderer.domElement.toDataURL('image/png');
    window.thumbnailWorker.complete({ jobId, data });
  } catch (error) {
    window.thumbnailWorker.complete({ jobId, error: String(error.message || error) });
  } finally {
    if (model) { stage.scene.remove(model); dispose(model); stage.renderer.renderLists.dispose(); }
  }
});
window.thumbnailWorker.ready();
