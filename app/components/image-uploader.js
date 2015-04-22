import Ember from 'ember';
import config from '../config/environment';

export default Ember.Component.extend({

    init: function() {
        this._super.apply(this, arguments);

        if (!this.get('upload-preset'))
            throw new Error('upload-preset attribute missing.');

    },

    classNames: ['relative', 'clearfix', 'image-upload-target'],

    classNameBindings: ['isDraggingOver:active'],

    cloudName: config.cloudinary.cloudName,

    // API - START

    'upload-preset': '',
    uploads: [],
    limit: 1, // max limit of file uploads
    uploading: false, // indicates whether some file is being uploaded

    // API - END

    _ignoreNextLeave: false,

    isDraggingOver: false,

    uploadingChange: function() {
        this.set('uploading', this.get('uploads').some(file => file.get('uploading')));
    }.observes('uploads.@each.uploading'),

    dragEnter: function(e) {

        // dragEnter and dragLeave logic inspired by http://stackoverflow.com/a/20976009/188740

        if (e.target !== this.element) {
            this.set('_ignoreNextLeave', true);
        }

        this.set('isDraggingOver', true);
    },

    dragLeave: function(e) {

        if (this.get('_ignoreNextLeave')) {
            this.set('_ignoreNextLeave', false);
            return;
        }

        this.set('isDraggingOver', false);
    },

    dragOver: function(e) {
        e.preventDefault();
    },

    drop: function(e) {
        e.preventDefault();
        this.upload(e.dataTransfer.files);
    },

    change: function(e) {
        if (e.target.tagName !== 'INPUT')
            return;

        if (e.target.getAttribute('type') !== 'file')
            return;

        this.upload(e.target.files);
    },

    upload: function(files) {
        this.setProperties({
            isDraggingOver: false,
        });

        for (var i = 0; i < files.length; i++) {
            this.uploadFile(files[i]);
        }
    },

    uploadFile: function(file) {
        var uploads = this.get('uploads');

        if (uploads.length >= this.get('limit')) {
            return;
        }


        var formData = new FormData();

        formData.append("upload_preset", this.get('upload-preset'));
        formData.append('file', file);

        var xhr = new XMLHttpRequest();

        var upload = Ember.Object.create({
            uploading: true,
            progressPercent: 0,
            abort() {
                xhr.abort();
            }
        });
        uploads.pushObject(upload);

        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + this.get('cloudName')  + '/image/upload');

        xhr.upload.addEventListener('progress', e => {
            if (!e.lengthComputable)
                return;

            upload.set('progressPercent', Math.round(100 * e.loaded / e.total));
        }, false);

        xhr.addEventListener('load', e => {
            var response = JSON.parse(e.target.responseText);

            if (e.target.status !== 200 && e.target.status !== 201) {
                upload.setProperties({
                    uploading: false,
                    progressPercent: null,
                    uploadError: response.error.message
                });
                return;
            }

            upload.setProperties({
                uploading: false,
                progressPercent: null,
                url: response.secure_url
            });

            this.sendAction('uploadFinished', upload);
        }, false);

        xhr.addEventListener('error', e => {
            upload.setProperties({
                uploading: false,
                progressPercent: null,
                uploadError: 'There was an unexpected upload error.'
            });
            this.sendAction('uploadError', upload);
        }, false);

        xhr.addEventListener('abort', e => {
            upload.setProperties({
                uploading: false,
                progressPercent: null,
                uploadError: 'Upload was aborted.'
            });
            this.sendAction('uploadAborted', upload);
        }, false);

        xhr.send(formData);
    }
});
