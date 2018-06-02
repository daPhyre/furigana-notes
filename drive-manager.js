/*eslint-env browser*/
/*jslint es5: true*/
/*globals gapi*/
(function (window, undefined) {
    'use strict';

    var APP_FOLDER = '.furigana-notes',
        API_KEY = 'AIzaSyBziWjt2y7b8LJNA1DkrPdT63mHcAuLmG4',
        CLIENT_ID = '888713048597-tt9fdvf9jrbprh7q19nu8j8chk3esb58.apps.googleusercontent.com',
        DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        SCOPES = 'https://www.googleapis.com/auth/drive.file',

        folderId,
        gapiLoaded = false,
        lastSync = 0,
        signInView,
        signOutView,
        syncPending = 0,
        userImage,
        userLabel;

    // Google sign in
    function signIn() {
        gapi.auth2.getAuthInstance().signIn();
    }

    // Google sign out
    function signOut() {
        gapi.auth2.getAuthInstance().signOut();
    }

    // Creates views for sign in or out
    function getAuthView() {
        var authView = document.createElement('div'),
            paragraph,
            button;
        authView.setAttribute('id', 'googleDriveAuth');

        if (signInView === undefined) {
            signInView = document.createElement('div');
            signInView.setAttribute('id', 'googleDriveSignIn');
            signInView.style.display = 'none';

            paragraph = document.createElement('p');
            paragraph.setAttribute('class', 'detailsContainer');
            paragraph.textContent = 'Sign in to sync your files with Google Drive.';
            signInView.appendChild(paragraph);

            button = document.createElement('button');
            button.setAttribute('type', 'button');
            button.textContent = 'Sign in';
            button.addEventListener('click', signIn);
            paragraph = document.createElement('p');
            paragraph.setAttribute('class', 'buttonContainer');
            paragraph.appendChild(button);
            signInView.appendChild(paragraph);
        }
        authView.appendChild(signInView);

        if (signOutView === undefined) {
            signOutView = document.createElement('div');
            signOutView.setAttribute('id', 'googleDriveSignOut');
            signOutView.style.display = 'none';

            userImage = document.createElement('img');
            userImage.setAttribute('alt', '[User image]');
            userImage.style.borderRadius = '16px';
            userImage.style.width = '32px';
            userLabel = document.createElement('span');
            paragraph = document.createElement('p');
            paragraph.setAttribute('class', 'detailsContainer');
            paragraph.appendChild(userImage);
            paragraph.appendChild(userLabel);
            signOutView.appendChild(paragraph);

            paragraph = document.createElement('p');
            paragraph.setAttribute('class', 'detailsContainer');
            paragraph.textContent = 'You are currently signed in and your files are in sync.';
            signOutView.appendChild(paragraph);

            button = document.createElement('button');
            button.setAttribute('type', 'button');
            button.textContent = 'Sync now';
            button.addEventListener('click', window.driveManager.sync);
            paragraph = document.createElement('p');
            paragraph.setAttribute('class', 'buttonContainer');
            paragraph.appendChild(button);
            signOutView.appendChild(paragraph);

            button = document.createElement('button');
            button.setAttribute('type', 'button');
            button.textContent = 'Sign out';
            button.addEventListener('click', signOut);
            paragraph = document.createElement('p');
            paragraph.setAttribute('class', 'buttonContainer');
            paragraph.appendChild(button);
            signOutView.appendChild(paragraph);
        }
        authView.appendChild(signOutView);

        return authView;
    }

    // When a sync is done, checks if there are still pending syncs or saves time and calls back onSyncFinished
    function syncDone() {
        syncPending -= 1;
        window.console.log('Items pending to sync: ' + syncPending);
        if (syncPending < 1) {
            lastSync = Date.now();
            localStorage.setItem('lastSync', lastSync);
            if (window.driveManager.onSyncFinished !== undefined) {
                window.driveManager.onSyncFinished();
            }
        }
    }

    // Sends a file to trash
    function fileTrash(fileId, callback) {
        window.console.log('Moving to trash: ' + fileId);
        syncPending += 1;
        gapi.client.drive.files.update({
            fileId: fileId,
            trashed: true
        }).then(function (response) {
            //window.console.log('Trashed: ', response);
            if (callback !== undefined) {
                callback(response.result.id);
            }
            syncDone();
        }, function (error) {
            window.console.error(error);
            syncDone();
        });
    }

    // Gets content from a file
    function getContentFromFile(fileId, callback) {
        syncPending += 1;
        window.console.log('Downloading: ' + fileId);
        gapi.client.drive.files.export({
            fileId: fileId,
            mimeType: 'text/plain'
        }).then(function (response) {
            //window.console.log(fileId, response.body);
            if (callback !== undefined) {
                callback(fileId, response.body);
            }
            syncDone();
        }, function (error) {
            window.console.error(error);
            syncDone();
        });
    }

    // Set content to a file
    function setContentToFile(name, fileId, body, callback) {
        if (folderId === undefined) {
            window.console.warn('Folder id is not defined: Unable to upload file.');
            return;
        }

        // Prepare data
        var boundary = '----' + Date.now(),
            fileMetadata = {
                mimeType: 'application/vnd.google-apps.document'
            },
            multipartBody = '';
        if (fileId === undefined) {
            fileMetadata.name = name;
            fileMetadata.parents = [folderId];
            window.console.log('Creating file ' + name);
        } else {
            window.console.log('Updating file ' + fileId);
        }

        // Set multipart body
        multipartBody = '--' + boundary + '\r\n' +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(fileMetadata) + '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: text/plain\r\n\r\n' +
            body + '\r\n' +
            '--' + boundary + '--';

        // Send data
        syncPending += 1;
        gapi.client.request({
            path: '/upload/drive/v3/files' + (fileId === undefined ? '' : '/' + fileId),
            method: fileId === undefined ? 'POST' : 'PATCH',
            params: {
                uploadType: 'multipart'
            },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartBody
        }).then(function (response) {
            //window.console.log('Created ' + response.result.id, response.result);
            if (callback !== undefined) {
                callback(name, fileId, response.result.id);
            }
            syncDone();
        }, function (error) {
            window.console.error(error);
            syncDone();
        });
    }

    // Get new files of type Google Document that are not in the trash
    function getFilesFromFolder(folderId, callback) {
        var query = "'" + folderId + "' in parents and trashed = false and mimeType = 'application/vnd.google-apps.document' and modifiedTime > '" + new Date(lastSync).toISOString() + "'";
        window.console.log('Retrieving files from query: ' + query);
        gapi.client.drive.files.list({
            'q': query,
            'fields': "nextPageToken, files(id, name)"
        }).then(function (response) {
            if (callback !== undefined) {
                callback(response.result.files);
            }
        }, function (error) {
            window.console.error(error);
            if (callback !== undefined) {
                callback();
            }
        });
    }

    // Gets the default folder for this app
    function getDefaultFolder() {
        gapi.client.drive.files.list({
            'q': "'root' in parents and name='" + APP_FOLDER + "' and mimeType='application/vnd.google-apps.folder'",
            'fields': "nextPageToken, files(id)"
        }).then(function (response) {
            var files = response.result.files;

            if (files && files.length > 0) {
                // Folder found. Set ID and sync
                syncPending -= 1;
                folderId = files[0].id;
                window.driveManager.sync();
            } else {
                // Folder not found; create
                window.console.log('Folder not found; creating…');
                gapi.client.drive.files.create({
                    resource: {
                        name: APP_FOLDER,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                }).then(function (response) {
                    syncPending -= 1;
                    folderId = response.result.id;
                    window.driveManager.sync();
                }, function (error) {
                    window.console.error(error);
                });
            }
        }, function (error) {
            window.console.error(error);
        });
    }

    // After a file is saved, attach it's fileId if not done before
    function onFileSaved(name, fileId, newFileId) {
        if (fileId !== newFileId) {
            var i,
                l,
                jsonLocalFiles = localStorage.getItem('data'),
                localFiles = [];

            if (jsonLocalFiles !== null) {
                localFiles = JSON.parse(jsonLocalFiles);
            }

            for (i = 0, l = localFiles.length; i < l; i += 1) {
                if (name === localFiles[i].id) {
                    localFiles[i].fileId = newFileId;
                    localStorage.setItem('data', JSON.stringify(localFiles));
                    break;
                }
            }
        }
    }

    // After a file is removed, delete from pendings
    function onFileRemoved(fileId) {
        var i,
            l,
            jsonPendingDelete = localStorage.getItem('pendingDelete'),
            pendingDelete = [];

        if (jsonPendingDelete !== null) {
            pendingDelete = JSON.parse(jsonPendingDelete);
        }

        for (i = 0, l = pendingDelete.length; i < l; i += 1) {
            if (fileId === pendingDelete[i]) {
                pendingDelete.splice(i, 1);
                localStorage.setItem('pendingDelete', JSON.stringify(pendingDelete));
                break;
            }
        }
    }

    // After a file is retrieved, update it's content to the local version, or create if it is new
    function onFileRetrieved(fileId, content) {
        var i,
            l,
            jsonLocalFiles = localStorage.getItem('data'),
            localFiles = [],
            updated = false;

        if (jsonLocalFiles !== null) {
            localFiles = JSON.parse(jsonLocalFiles);
        }

        for (i = 0, l = localFiles.length; i < l; i += 1) {
            if (fileId === localFiles[i].fileId) {
                localFiles[i].content = content;
                updated = true;
                break;
            }
        }
        if (!updated) {
            localFiles.unshift({id: Date.now().toString(36), content: content, fileId: fileId, lastUpdate: Date.now()});
        }
        localStorage.setItem('data', JSON.stringify(localFiles));
    }

    // Sync files
    function sync(oneWay) {
        if (!gapiLoaded) {
            // Don't call if Google API has not loaded yet
            window.console.warn('Sync is not ready yet; ignoring call');
            return;
        }
        if (syncPending > 0) {
            // Don't call again if sync is already in progress
            window.console.warn('Sync already in progress');
            return;
        }
        // Set initial sync to prevent more sync calls
        syncPending += 1;
        if (folderId === undefined) {
            // Get default folder if it's not available yet
            getDefaultFolder();
            return;
        }
        var file,
            i,
            l,
            jsonLocalFiles = localStorage.getItem('data'),
            jsonPendingDelete = localStorage.getItem('pendingDelete'),
            localFiles = [],
            pendingDelete = [],
            stringLastSync = localStorage.getItem('lastSync') || '0';

        lastSync = Number(stringLastSync);

        if (jsonLocalFiles !== null) {
            localFiles = JSON.parse(jsonLocalFiles);
        }

        if (jsonPendingDelete !== null) {
            pendingDelete = JSON.parse(jsonPendingDelete);
        }

        for (i = 0, l = pendingDelete.length; i < l; i += 1) {
            // Send pending files to trash
            fileTrash(pendingDelete[i], onFileRemoved);
        }

        for (i = 0, l = localFiles.length; i < l; i += 1) {
            // Upload pending files
            file = localFiles[i];
            if (file.lastUpdate === undefined || file.lastUpdate > lastSync) {
                setContentToFile(file.id, file.fileId, file.content, onFileSaved);
            }
        }

        if (oneWay !== true) {
            // Get new files from web
            getFilesFromFolder(folderId, function (files) {
                if (files) {
                    window.console.log('Retrieved ' + files.length + ' new files.');
                    for (i = 0, l = files.length; i < l; i += 1) {
                        // Set content from files out of sync
                        getContentFromFile(files[i].id, onFileRetrieved);
                    }
                } else {
                    window.console.log('Error obtaining files.');
                }

                // Remove initial sync
                syncDone();
            });
        } else {
            // Remove initial sync
            syncDone();
        }
    }

    // Called when sign status has changed
    function onSignInStatus(isSignedIn) {
        window.console.log('Sign in state changed:', isSignedIn);
        var profile;

        if (isSignedIn) {
            // Set views and get user data
            signInView.style.display = 'none';
            signOutView.style.display = '';
            profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
            userImage.setAttribute('src', profile.getImageUrl());
            userLabel.textContent = ' Hi, ' + profile.getName();

            if (window.driveManager.onSignIn !== undefined) {
                window.driveManager.onSignIn();
            }

            sync();
        } else {
            // Set views and clear user data
            signInView.style.display = '';
            signOutView.style.display = 'none';
            userImage.setAttribute('src', '');
            userLabel.textContent = '';

            if (window.driveManager.onSignOut !== undefined) {
                window.driveManager.onSignOut();
            }
        }
    }

    // Initializes the Google API client
    function initClient() {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(function () {
            gapiLoaded = true;
            gapi.auth2.getAuthInstance().isSignedIn.listen(onSignInStatus);
            onSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        });
    }

    window.driveManager = {
        init: function () {
            gapi.load('client:auth2', initClient);
        },
        getAuthView: getAuthView,
        onSignIn: undefined,
        onSignOut: undefined,
        onSyncFinished: undefined,
        sync: sync
    };

}(window));
