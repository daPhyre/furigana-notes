/*eslint-env browser*/
/*jslint es5: true*/
(function (window, undefined) {
    'use strict';
    var about,
        collectionView,
        content,
        currentNote = 0,
        currentPage = 0,
        editContainer,
        editTextarea,
        leftBarButton,
        mainSection,
        notes = [],
        rightBarButton,

        PAGE_HOME = 0,
        PAGE_VIEW = 1,
        PAGE_EDIT = 2,
        PAGE_ABOUT = 3;

    function leftBarButtonPressed() {
        switch (currentPage) {
        case PAGE_HOME:
            if (notes.length > 0) {
                window.location.hash = 'about';
            }
            break;
        case PAGE_EDIT:
            window.history.back();
            break;
        case PAGE_VIEW:
            window.history.back();
            break;
        case PAGE_ABOUT:
            window.history.back();
            break;
        }
    }

    function rightBarButtonPressed() {
        switch (currentPage) {
        case PAGE_HOME:
            window.location.hash = 'edit';
            currentNote = notes.length;
            break;
        case PAGE_EDIT:
            if (currentNote < notes.length) {
                if (editTextarea.value.length > 0) {
                    notes[currentNote] = editTextarea.value;
                    window.history.back();
                } else if (window.confirm('Delete this note?')) {
                    notes.splice(currentNote, 1);
                    window.history.go(-2);
                }
            } else if (editTextarea.value.length > 0) {
                notes.push(editTextarea.value);
                window.history.back();
                setTimeout(function () {
                    window.location.hash = 'view';
                }, 10);
            }
            localStorage.setItem('data', JSON.stringify(notes));
            break;
        case PAGE_VIEW:
            window.location.hash = 'edit';
            break;
        case PAGE_ABOUT:
            break;
        }
    }

    function editCurrentNote() {
        window.location.hash = 'edit';
    }

    function firstNote(evt) {
        evt.target.parentElement.removeChild(evt.target);
        currentNote = notes.length;
        window.location.hash = 'edit';
    }

    function openNote(evt) {
        currentNote = evt.target.index;
        window.location.hash = 'view';
    }

    function onHashChange() {
        var button,
            collectionItem,
            i,
            l;

        switch (window.location.hash) {
        case '#about':
            currentPage = PAGE_ABOUT;
            about.style.display = '';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = 'none';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = '';
            rightBarButton.style.backgroundImage = 'none';
            break;
        case '#edit':
            if (currentPage !== PAGE_EDIT) {
                if (currentNote < notes.length && notes[currentNote].length > 0) {
                    editTextarea.value = notes[currentNote];
                } else {
                    editTextarea.value = '';
                }
            }
            currentPage = PAGE_EDIT;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = '';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = 'Done';
            rightBarButton.style.backgroundImage = 'url("images/ic_done_white_24px.svg")';

            editTextarea.focus();
            break;
        case '#view':
            if (currentPage === PAGE_EDIT && notes[currentNote].length > 0 && notes[currentNote].length !== editTextarea.value.length) {
                if (!window.confirm('Exit without save?')) {
                    window.location.hash = 'edit';
                    return;
                }
            }
            if (currentNote < notes.length && notes[currentNote].length > 0) {
                content.innerHTML = '<p>' + notes[currentNote].replace(/\n/g, '</p><p>').replace(/(.)（(.+?(?=）))）|\[(.+?(?=\]))\]\((.+?(?=\)))\)/g, '<ruby>$1$3<rp>(</rp><rt>$2$4</rt><rp>)</rp></ruby>') + '</p>';
            } else {
                window.history.back();
            }
            currentPage = PAGE_VIEW;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = '';
            editContainer.style.display = 'none';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = 'Edit';
            rightBarButton.style.backgroundImage = 'url("images/ic_edit_white_24px.svg")';
            break;
        default:
            currentPage = PAGE_HOME;
            about.style.display = 'none';
            collectionView.style.display = '';
            content.style.display = 'none';
            editContainer.style.display = 'none';

            leftBarButton.title = 'About';
            leftBarButton.style.backgroundImage = 'url("images/ic_help_white_24px.svg")';
            rightBarButton.title = 'Add';
            rightBarButton.style.backgroundImage = 'url("images/ic_add_white_24px.svg")';

            while (collectionView.firstChild) {
                collectionView.removeChild(collectionView.firstChild);
            }
            if (notes.length > 0) {
                for (i = 0, l = notes.length; i < l; i += 1) {
                    collectionItem = document.createElement('p');
                    collectionItem.index = i;
                    collectionItem.addEventListener('click', openNote);
                    collectionItem.classList.add('collectionItem');
                    collectionItem.textContent = notes[i];
                    collectionView.appendChild(collectionItem);
                }
            } else {
                leftBarButton.title = '';
                leftBarButton.style.backgroundImage = 'none';

                about.style.display = '';
                if (document.getElementById('firstNote') === null) {
                    button = document.createElement('button');
                    button.addEventListener('click', firstNote);
                    button.setAttribute('id', 'firstNote');
                    button.setAttribute('type', 'button');
                    button.textContent = 'Create your first note!';
                    about.appendChild(button);
                }
            }
        }
    }

    function onLoad() {
        var data = localStorage.getItem('data'),
            preload = document.getElementById('preload');

        about = document.getElementById('about');
        content = document.createElement('div');
        editContainer = document.createElement('div');
        editTextarea = document.createElement('textarea');
        leftBarButton = document.getElementById('leftBarButton');
        mainSection = document.getElementById('mainSection');
        collectionView = document.createElement('div');
        rightBarButton = document.getElementById('rightBarButton');

        if (data !== null) {
            notes = JSON.parse(data);
        }

        content.setAttribute('id', 'content');
        editContainer.setAttribute('id', 'editContainer');
        editTextarea.setAttribute('id', 'editTextarea');
        editTextarea.setAttribute('placeholder', '振（ふ）り仮（が）名（な）\n[日](に)[本](ほん)[語](ご)');
        collectionView.setAttribute('id', 'collectionView');

        preload.parentElement.removeChild(preload);
        editContainer.appendChild(editTextarea);
        mainSection.appendChild(content);
        mainSection.appendChild(editContainer);
        mainSection.appendChild(collectionView);

        content.addEventListener('dblclick', editCurrentNote);
        leftBarButton.addEventListener('click', leftBarButtonPressed);
        rightBarButton.addEventListener('click', rightBarButtonPressed);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(function (registration) {
                window.console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, function (err) {
                window.console.log('ServiceWorker registration failed: ', err);
            });
        } else {
            window.console.log('ServiceWorker not supported');
        }

        window.addEventListener('hashchange', onHashChange);
        onHashChange();
    }

    window.addEventListener('load', onLoad);
}(window));
