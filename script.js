/*eslint-env browser*/
/*jslint es5: true*/
(function (window, undefined) {
    'use strict';
    var about,
        cancelEdit = false,
        collectionView,
        content,
        currentNote = 0,
        currentPage = 0,
        deletedNotes = [],
        demoText = '[日]（ひ）\n[日](ひ)\n日（ひ）\n日(ひ)',
        editContainer,
        editTextarea,
        leftBarButton,
        loader,
        mainSection,
        menuContainer,
        menuHome,
        menuView,
        notes = [],
        options,
        pageProfile,
        pageOptions,
        replaceRegExp,
        replaceResult,
        replaceOptionBracketsBoth = '\\[(.+?(?=\\]))\\](?:（(.+?(?=）))）|\\((.+?(?=\\)))\\))',
        replaceOptionBracketsFullWitdhParenthesis = '\\[(.+?(?=\\]))\\]（(.+?(?=）))）',
        replaceOptionBracketsParenthesis = '\\[(.+?(?=\\]))\\]\\((.+?(?=\\)))\\)',
        replaceOptionFullWidthParenthesis = '(\\S)（(.+?(?=）))）',
        replaceOptionParenthesis = '(\\S)\\((.+?(?=\\)))\\)',
        rightBarButton,

        PAGE_HOME = 0,
        PAGE_VIEW = 1,
        PAGE_EDIT = 2,
        PAGE_PROFILE = 3,
        PAGE_OPTIONS = 4,
        PAGE_ABOUT = 5;

    // Actions for left button.
    function leftBarButtonPressed() {
        switch (currentPage) {
        case PAGE_HOME:
            // On home, opens or closes the side menu, if current page is not about (on zero notes).
            if (notes.length > 0) {
                //window.location.hash = 'about';
                if (menuHome.style.display === '') {
                    menuHome.style.display = 'none';
                } else {
                    menuHome.style.display = '';
                }
            }
            break;
        case PAGE_EDIT:
            // On edit, cancels current edition and goes back to view.
            cancelEdit = true;
            window.history.back();
            break;
        case PAGE_VIEW:
            // On view, goes back to home.
            window.history.back();
            break;
        case PAGE_PROFILE:
            // On profile, goes back to home.
            window.history.back();
            break;
        case PAGE_OPTIONS:
            // On options, goes back to home.
            window.history.back();
            break;
        case PAGE_ABOUT:
            // On about, goes back to home.
            window.history.back();
            break;
        }
    }

    // Actions for right button.
    function rightBarButtonPressed() {
        switch (currentPage) {
        case PAGE_HOME:
            // On home, opens a new note for edition.
            window.location.hash = 'edit';
            currentNote = notes.length;
            break;
        case PAGE_EDIT:
            // On edit, goes back to view and saves current note.
            window.history.back();
            break;
        case PAGE_VIEW:
            // On view, opens or closes a menu with more options.
            if (menuView.style.display === '') {
                menuView.style.display = 'none';
            } else {
                menuView.style.display = '';
            }
            break;
        case PAGE_PROFILE:
            // On profile, does nothing.
            break;
        case PAGE_OPTIONS:
            // On options, does nothing.
            break;
        case PAGE_ABOUT:
            // On about, does nothing.
            break;
        }
    }

    // Syncs if network is available
    function syncIfPossible(oneWay) {
        if (navigator.onLine && (options.celullarSync || !(navigator.connection && navigator.connection.type === 'cellular'))) {
            loader.style.display = '';
            window.console.log('Syncing…');
            window.driveManager.sync(oneWay);
        }
    }

    // Opens current note for edition.
    function editCurrentNote() {
        window.location.hash = 'edit';
    }

    // Opens the login page for edit and removes first time buttons.
    function firstLogin() {
        var firstTimeButtons = document.getElementById('firstTimeButtons');
        if (firstTimeButtons !== null) {
            firstTimeButtons.parentElement.removeChild(firstTimeButtons);
        }
        window.location.hash = 'profile';
    }

    // Opens a new note for edit and removes first time buttons.
    function firstNote() {
        var firstTimeButtons = document.getElementById('firstTimeButtons');
        if (firstTimeButtons !== null) {
            firstTimeButtons.parentElement.removeChild(firstTimeButtons);
        }
        currentNote = notes.length;
        window.location.hash = 'edit';
    }

    // Transforms text into HTML with ruby markup
    function getRubyHtmlFrom(text) {
        return '<p>' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(replaceRegExp, replaceResult).replace(/\n/g, '&nbsp;</p><p>') + '</p>';
    }

    // Loads saved notes
    function loadSavedNotes() {
        var jsonNotes = localStorage.getItem('data'),
            jsonDeletedNotes = localStorage.getItem('pendingDelete'),
            i,
            l;

        if (jsonDeletedNotes !== null) {
            deletedNotes = JSON.parse(jsonDeletedNotes);
            window.console.log('deletedNotes', deletedNotes);
        }

        if (jsonNotes !== null) {
            notes = JSON.parse(jsonNotes);
            window.console.log('notes', notes);
            // Update users with older data format
            if (notes.length > 0 && typeof notes[0] === 'string') {
                window.console.log('Older data format; updating…');
                for (i = 0, l = notes.length; i < l; i += 1) {
                    if (typeof notes[i] === 'string') {
                        notes[i] = {id: (Date.now() + i).toString(36), content: notes[i]};
                    }
                }
                window.console.log(notes);
                localStorage.setItem('data', JSON.stringify(notes));
            }
        }
    }

    // Deletes current note if confirmed.
    function noteDelete(evt) {
        if (evt !== undefined) {
            evt.preventDefault();
        }
        menuView.style.display = 'none';
        if (window.confirm('Delete this note?')) {
            var note = notes.splice(currentNote, 1)[0];
            if (note.fileId !== undefined) {
                deletedNotes.push(note.fileId);
                localStorage.setItem('pendingDelete', JSON.stringify(deletedNotes));
                syncIfPossible(true);
            }
            window.history.back();
        }
    }

    /*
    // REMOVED: jsPDF doesn't supports ruby mark correctly yet. Code left for future possible implementation.
    // Creates a PDF document for download with the current note content.
    function noteDownloadAsPdf(evt) {
        if (evt !== undefined) {
            evt.preventDefault();
        }
        menuView.style.display = 'none';
        var pdf = new jsPDF('p', 'pt', 'letter');
        pdf.fromHTML(content, 15, 15);
        pdf.save();
    }
    */

    // Opens print dialog for current note.
    function notePrint(evt) {
        if (evt !== undefined) {
            evt.preventDefault();
        }
        menuView.style.display = 'none';
        window.print();
    }

    // Opens selected note for viewing.
    function noteView(evt) {
        currentNote = evt.target.index;
        window.location.hash = 'view';
    }

    // Creates the side menu at home
    function setMenuHome() {
        var anchor,
            li;

        menuHome = document.createElement('ul');
        menuHome.setAttribute('id', 'menuHome');

        anchor = document.createElement('a');
        anchor.setAttribute('href', '#profile');
        anchor.textContent = 'Sync notes';
        li = document.createElement('li');
        li.append(anchor);
        menuHome.append(li);

        anchor = document.createElement('a');
        anchor.setAttribute('href', '#options');
        anchor.textContent = 'Options';
        li = document.createElement('li');
        li.append(anchor);
        menuHome.append(li);

        anchor = document.createElement('a');
        anchor.setAttribute('href', '#about');
        anchor.textContent = 'About';
        li = document.createElement('li');
        li.append(anchor);
        menuHome.append(li);
    }

    // Creates the options menu at view
    function setMenuView() {
        var anchor,
            li;

        menuView = document.createElement('ul');
        menuView.setAttribute('id', 'menuView');

        anchor = document.createElement('a');
        anchor.setAttribute('href', '#edit');
        anchor.textContent = 'Edit';
        li = document.createElement('li');
        li.append(anchor);
        menuView.append(li);

        anchor = document.createElement('a');
        anchor.addEventListener('click', noteDelete);
        anchor.setAttribute('href', '#delete');
        anchor.textContent = 'Delete';
        li = document.createElement('li');
        li.append(anchor);
        menuView.append(li);

        anchor = document.createElement('a');
        anchor.addEventListener('click', notePrint);
        anchor.setAttribute('href', '#print');
        anchor.textContent = 'Print';
        li = document.createElement('li');
        li.append(anchor);
        menuView.append(li);

        /*
        // REMOVED: jsPDF doesn't supports ruby mark correctly yet. Code left for future possible implementation.
        anchor = document.createElement('a');
        anchor.addEventListener('click', noteDownloadAsPdf);
        anchor.setAttribute('href', '#download');
        anchor.textContent = 'Download as PDF';
        li = document.createElement('li');
        li.append(anchor);
        menuView.append(li);
        */
    }

    // Sets the customizable options
    function setOptions() {
        var data = localStorage.getItem('options'),
            evens = [],
            i,
            l,
            odds = [],
            regexOptions = [];

        if (data === null) {
            // Sets initial options if none
            options = {
                bracketsFullWidthParenthesis: true,
                bracketsParenthesis: true,
                celullarSync: false,
                fullWidthParenthesis: true,
                lineHeight: '1.2',
                parenthesis: true
            };
        } else {
            // Obtains options from local storage
            options = JSON.parse(data);
        }

        content.style.lineHeight = options.lineHeight;

        if (options.fullWidthParenthesis) {
            regexOptions.push(replaceOptionFullWidthParenthesis);
        }
        if (options.parenthesis) {
            regexOptions.push(replaceOptionParenthesis);
        }
        // WARNING: brackets uses an special combined regex to prevent conflicts between these two. Because od this combined regex, it must be placed at the end because of this regex rules pairing.
        if (options.bracketsFullWidthParenthesis) {
            if (options.bracketsParenthesis) {
                regexOptions.push(replaceOptionBracketsBoth);
            } else {
                regexOptions.push(replaceOptionBracketsFullWitdhParenthesis);
            }
        } else if (options.bracketsParenthesis) {
            regexOptions.push(replaceOptionBracketsParenthesis);
        }

        if (regexOptions.length > 0) {
            // Generate the regex for user's settings
            for (i = 0, l = regexOptions.length; i < l; i += 1) {
                odds.push(String(i * 2 + 1));
                evens.push(String(i * 2 + 2));
                if (options.bracketsFullWidthParenthesis && options.bracketsParenthesis && i === l - 1) {
                    evens.push(String(i * 2 + 3));
                }
            }

            replaceRegExp = new RegExp(regexOptions.join('|'), 'g');
            replaceResult = '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>'.replace('$1', '$' + odds.join('$')).replace('$2', '$' + evens.join('$'));
        } else {
            // Clear the regex
            replaceRegExp = '';
            replaceResult = '';
        }

        //window.console.log(replaceRegExp, replaceResult);
    }

    // Creates the page for user customizable options
    function setPageOptions() {
        var button,
            demoTextDiv,
            input,
            label,
            paragraph;

        input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.checked = options.celullarSync;
        input.addEventListener('change', function (evt) {
            options.celullarSync = evt.target.checked;
            localStorage.setItem('options', JSON.stringify(options));
            setOptions();
        });
        label = document.createElement('label');
        label.textContent = ' Sync also with my mobile data (only WiFi by default).';
        label.insertBefore(input, label.firstChild);
        paragraph = document.createElement('p');
        paragraph.appendChild(label);
        pageOptions.appendChild(paragraph);

        input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.checked = options.bracketsFullWidthParenthesis;
        input.addEventListener('change', function (evt) {
            options.bracketsFullWidthParenthesis = evt.target.checked;
            localStorage.setItem('options', JSON.stringify(options));
            setOptions();
            demoTextDiv.innerHTML = getRubyHtmlFrom(demoText);
        });
        label = document.createElement('label');
        label.textContent = ' Set furigana for text in brackets with text in full width parenthesis. [日]（ひ）';
        label.insertBefore(input, label.firstChild);
        paragraph = document.createElement('p');
        paragraph.appendChild(label);
        pageOptions.appendChild(paragraph);

        input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.checked = options.bracketsParenthesis;
        input.addEventListener('change', function (evt) {
            options.bracketsParenthesis = evt.target.checked;
            localStorage.setItem('options', JSON.stringify(options));
            setOptions();
            demoTextDiv.innerHTML = getRubyHtmlFrom(demoText);
        });
        label = document.createElement('label');
        label.textContent = ' Set furigana for text in brackets with text in parenthesis. [日](ひ)';
        label.insertBefore(input, label.firstChild);
        paragraph = document.createElement('p');
        paragraph.appendChild(label);
        pageOptions.appendChild(paragraph);

        input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.checked = options.fullWidthParenthesis;
        input.addEventListener('change', function (evt) {
            options.fullWidthParenthesis = evt.target.checked;
            localStorage.setItem('options', JSON.stringify(options));
            setOptions();
            demoTextDiv.innerHTML = getRubyHtmlFrom(demoText);
        });
        label = document.createElement('label');
        label.textContent = ' Set furigana for any character with text in full width parenthesis. 日（ひ）';
        label.insertBefore(input, label.firstChild);
        paragraph = document.createElement('p');
        paragraph.appendChild(label);
        pageOptions.appendChild(paragraph);

        input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.checked = options.parenthesis;
        input.addEventListener('change', function (evt) {
            options.parenthesis = evt.target.checked;
            localStorage.setItem('options', JSON.stringify(options));
            setOptions();
            demoTextDiv.innerHTML = getRubyHtmlFrom(demoText);
        });
        label = document.createElement('label');
        label.textContent = ' Set furigana for any character with text in parenthesis. 日(ひ)';
        label.insertBefore(input, label.firstChild);
        paragraph = document.createElement('p');
        paragraph.appendChild(label);
        pageOptions.appendChild(paragraph);

        input = document.createElement('input');
        input.setAttribute('type', 'number');
        input.value = options.lineHeight;
        input.setAttribute('min', '0');
        input.setAttribute('max', '2');
        input.setAttribute('step', '0.1');
        input.addEventListener('input', function (evt) {
            if (!isNaN(evt.target.value)) {
                options.lineHeight = evt.target.value;
                demoTextDiv.style.lineHeight = options.lineHeight;
                content.style.lineHeight = options.lineHeight;
                localStorage.setItem('options', JSON.stringify(options));
            }
        });
        label = document.createElement('label');
        label.textContent = ' Space between lines';
        label.insertBefore(input, label.firstChild);
        paragraph = document.createElement('p');
        paragraph.appendChild(label);
        pageOptions.appendChild(paragraph);

        demoTextDiv = document.createElement('div');
        demoTextDiv.innerHTML = getRubyHtmlFrom(demoText);
        demoTextDiv.style.background = '#eee';
        demoTextDiv.style.border = '1px dotted #ccc';
        demoTextDiv.style.lineHeight = options.lineHeight;
        demoTextDiv.style.padding = '1em';
        pageOptions.appendChild(demoTextDiv);

        button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.textContent = 'Reset all to default';
        button.addEventListener('click', function () {
            localStorage.removeItem('options');
            window.location.reload();
        });
        pageOptions.appendChild(button);
    }

    // Checks for connection change to sync any pending data
    function onConnectionChange() {
        window.console.log('Connection changed. Attempting to sync…');
        syncIfPossible();
    }

    // Checks for changes on URL hash
    function onHashChange() {
        var button,
            collectionItem,
            div,
            i,
            l,
            note,
            paragraph;

        menuHome.style.display = 'none';
        menuView.style.display = 'none';
        switch (window.location.hash) {
        case '#about':
            currentPage = PAGE_ABOUT;
            about.style.display = '';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = 'none';
            pageOptions.style.display = 'none';
            pageProfile.style.display = 'none';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = '';
            rightBarButton.style.backgroundImage = 'none';
            break;
        case '#edit':
            if (currentPage !== PAGE_EDIT) {
                // If edition was canceled, current page will remain the same; if not, set edit text area:
                if (currentNote < notes.length && notes[currentNote].content.length > 0) {
                    editTextarea.value = notes[currentNote].content;
                } else {
                    editTextarea.value = '';
                }
            }
            currentPage = PAGE_EDIT;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = '';
            pageOptions.style.display = 'none';
            pageProfile.style.display = 'none';

            leftBarButton.title = 'Cancel';
            leftBarButton.style.backgroundImage = 'url("images/ic_cancel_white_24px.svg")';
            rightBarButton.title = 'Done';
            rightBarButton.style.backgroundImage = 'url("images/ic_done_white_24px.svg")';

            editTextarea.focus();
            break;
        case '#options':
            currentPage = PAGE_OPTIONS;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = 'none';
            pageOptions.style.display = '';
            pageProfile.style.display = 'none';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = '';
            rightBarButton.style.backgroundImage = 'none';
            break;
        case '#profile':
            currentPage = PAGE_PROFILE;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = 'none';
            pageOptions.style.display = 'none';
            pageProfile.style.display = '';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = '';
            rightBarButton.style.backgroundImage = 'none';
            break;
        case '#view':
            if (currentPage === PAGE_EDIT) {
                // Comming from note edition
                if (cancelEdit) {
                    cancelEdit = false;
                    if (notes[currentNote].content.length !== editTextarea.value.length) {
                        if (!window.confirm('Exit without save?')) {
                            window.location.hash = 'edit';
                            return;
                        }
                    }
                } else {
                    if (editTextarea.value.length > 0) {
                        if (currentNote < notes.length) {
                            note = notes.splice(currentNote, 1)[0];
                            note.content = editTextarea.value;
                            note.lastUpdate = Date.now();
                            notes.unshift(note);
                        } else {
                            notes.unshift({id: Date.now().toString(36), content: editTextarea.value});
                        }
                        currentNote = 0;
                        localStorage.setItem('data', JSON.stringify(notes));
                        syncIfPossible(true);
                    } else if (window.confirm('Delete this note?')) {
                        note = notes.splice(currentNote, 1)[0];
                        if (note.fileId !== undefined) {
                            deletedNotes.push(note.fileId);
                            localStorage.setItem('pendingDelete', JSON.stringify(deletedNotes));
                            syncIfPossible(true);
                        }
                        window.history.back();
                        return;
                    }
                }
            }
            if (currentNote < notes.length && notes[currentNote].content.length > 0) {
                content.innerHTML = getRubyHtmlFrom(notes[currentNote].content);
            } else {
                window.history.back();
            }
            currentPage = PAGE_VIEW;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = '';
            editContainer.style.display = 'none';
            pageOptions.style.display = 'none';
            pageProfile.style.display = 'none';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = 'Edit';
            rightBarButton.style.backgroundImage = 'url("images/ic_more_vert_white_24px.svg")';
            break;
        default:
            if (currentPage === PAGE_EDIT) {
                // Comming from first note
                if (cancelEdit) {
                    cancelEdit = false;
                    if (!window.confirm('Exit without save?')) {
                        window.location.hash = 'edit';
                        return;
                    }
                } else if (editTextarea.value.length > 0) {
                    notes.unshift({id: Date.now().toString(36), content: editTextarea.value});
                    currentNote = 0;
                    localStorage.setItem('data', JSON.stringify(notes));
                    syncIfPossible(true);
                    window.location.hash = 'view';
                }
            }
            currentPage = PAGE_HOME;
            about.style.display = 'none';
            collectionView.style.display = '';
            content.style.display = 'none';
            editContainer.style.display = 'none';
            pageOptions.style.display = 'none';
            pageProfile.style.display = 'none';

            leftBarButton.title = 'About';
            leftBarButton.style.backgroundImage = 'url("images/ic_menu_white_24px.svg")';
            rightBarButton.title = 'Add';
            rightBarButton.style.backgroundImage = 'url("images/ic_add_white_24px.svg")';

            while (collectionView.firstChild) {
                collectionView.removeChild(collectionView.firstChild);
            }
            if (notes.length > 0) {
                for (i = 0, l = notes.length; i < l; i += 1) {
                    collectionItem = document.createElement('p');
                    collectionItem.index = i;
                    collectionItem.addEventListener('click', noteView);
                    collectionItem.classList.add('collectionItem');
                    collectionItem.textContent = notes[i].content;
                    collectionView.appendChild(collectionItem);
                }
            } else {
                leftBarButton.title = '';
                leftBarButton.style.backgroundImage = 'none';

                about.style.display = '';
                if (document.getElementById('firstTimeButtons') === null) {
                    div = document.createElement('div');
                    div.setAttribute('id', 'firstTimeButtons');

                    button = document.createElement('button');
                    button.addEventListener('click', firstNote);
                    button.setAttribute('type', 'button');
                    button.textContent = 'Create your first note!';
                    paragraph = document.createElement('p');
                    paragraph.appendChild(button);
                    div.appendChild(paragraph);

                    paragraph = document.createElement('p');
                    paragraph.textContent = ' - or - ';
                    div.appendChild(paragraph);

                    button = document.createElement('button');
                    button.addEventListener('click', firstLogin);
                    button.setAttribute('type', 'button');
                    button.textContent = 'Login to sync your notes';
                    paragraph = document.createElement('p');
                    paragraph.appendChild(button);
                    div.appendChild(paragraph);

                    about.appendChild(div);
                }
            }
        }
    }

    // Initializes data on page load
    function onLoad() {
        var preload = document.getElementById('preload');

        loadSavedNotes();

        // Setup page elements.
        about = document.getElementById('about');
        collectionView = document.createElement('div');
        content = document.createElement('div');
        editContainer = document.createElement('div');
        editTextarea = document.createElement('textarea');
        leftBarButton = document.getElementById('leftBarButton');
        loader = document.createElement('div');
        mainSection = document.getElementById('mainSection');
        menuContainer = document.createElement('div');
        pageOptions = document.createElement('div');
        pageProfile = window.driveManager.getAuthView();
        rightBarButton = document.getElementById('rightBarButton');

        setOptions();

        content.setAttribute('id', 'content');
        editContainer.setAttribute('id', 'editContainer');
        editTextarea.setAttribute('id', 'editTextarea');
        editTextarea.setAttribute('placeholder', '振（ふ）り仮（が）名（な）\n[日](に)[本](ほん)[語](ご)');
        collectionView.setAttribute('id', 'collectionView');
        loader.setAttribute('id', 'loader');
        menuContainer.setAttribute('id', 'menuContainer');
        pageOptions.setAttribute('id', 'options');
        pageProfile.setAttribute('id', 'profile');

        preload.parentElement.removeChild(preload);
        editContainer.appendChild(editTextarea);
        mainSection.appendChild(content);
        mainSection.appendChild(editContainer);
        mainSection.appendChild(collectionView);
        mainSection.appendChild(menuContainer);
        mainSection.append(pageOptions);
        mainSection.append(pageProfile);

        setMenuHome();
        mainSection.appendChild(menuHome);

        setMenuView();
        menuContainer.appendChild(menuView);

        setPageOptions();

        // Append loader at the end
        loader.style.display = 'none';
        mainSection.appendChild(loader);

        // Add listeners to buttons
        content.addEventListener('dblclick', editCurrentNote);
        leftBarButton.addEventListener('click', leftBarButtonPressed);
        rightBarButton.addEventListener('click', rightBarButtonPressed);

        // Set drive manager callbacks
        window.driveManager.onSignIn = function () {
            if (currentPage === PAGE_PROFILE) {
                window.history.back();
            }
        };

        window.driveManager.onSyncFinished = function () {
            window.console.log('Sync done. Refreshing');
            loader.style.display = 'none';
            loadSavedNotes();

            if (currentPage === PAGE_HOME) {
                // Refresh home screen
                window.console.log('Refreshing home screen');
                onHashChange();
            }
        };

        // Service worker for app cache.
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(function (registration) {
                window.console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, function (err) {
                window.console.log('ServiceWorker registration failed: ', err);
            });
        } else {
            window.console.log('ServiceWorker not supported');
        }

        // Hash change for page navigation.
        window.addEventListener('hashchange', onHashChange);
        onHashChange();

        // Navigator connection for file sync.
        if (navigator.connection) {
            navigator.connection.addEventListener('change', onConnectionChange);
        } else {
            window.addEventListener('online', onConnectionChange);
            window.addEventListener('offline', onConnectionChange);
        }
        onConnectionChange();
    }

    window.addEventListener('load', onLoad);
}(window));
