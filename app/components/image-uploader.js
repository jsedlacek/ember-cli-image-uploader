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
    files: [],
    limit: 1, // max limit of files

    // API - END

    _ignoreNextLeave: false,

    isDraggingOver: false,

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
        var files = this.get('files');

        if (files.length >= this.get('limit')) {
            return;
        }


        var formData = new FormData();

        formData.append("upload_preset", this.get('upload-preset'));
        formData.append('file', file);

        var info = Ember.Object.create({
            uploading: true,
            progressPercent: 0
        });
        files.pushObject(info);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + this.get('cloudName')  + '/image/upload');

        xhr.upload.addEventListener('progress', e => {
            if (!e.lengthComputable)
                return;

            info.set('progressPercent', Math.round(100 * e.loaded / e.total));
        }, false);

        xhr.addEventListener('load', e => {
            var response = JSON.parse(e.target.responseText);

            if (e.target.status !== 200 && e.target.status !== 201) {
                info.setProperties({
                    uploading: false,
                    progressPercent: null,
                    uploadError: response.error.message
                });
                return;
            }

            info.setProperties({
                uploading: false,
                progressPercent: null,
                url: response.secure_url
            });
        }, false);

        xhr.addEventListener('error', e => {
            info.setProperties({
                uploading: false,
                progressPercent: null,
                uploadError: 'There was an unexpected upload error.'
            });
        }, false);

        xhr.addEventListener('abort', e => {
            info.setProperties({
                uploading: false,
                progressPercent: null,
                uploadError: 'Upload was aborted.'
            });
        }, false);

        xhr.send(formData);
    }
});
