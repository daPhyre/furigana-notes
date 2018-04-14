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
        editContainer,
        editTextarea,
        leftBarButton,
        mainSection,
        menuContainer,
        menuHome,
        menuView,
        notes = [],
        options,
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
        PAGE_OPTIONS = 3,
        PAGE_ABOUT = 4;

    function leftBarButtonPressed() {
        // Actions for left button.
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

    function rightBarButtonPressed() {
        // Actions for right button.
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
        case PAGE_OPTIONS:
            // On options, does nothing.
            break;
        case PAGE_ABOUT:
            // On about, does nothing.
            break;
        }
    }

    function editCurrentNote() {
        // Opens current note for edition.
        window.location.hash = 'edit';
    }

    function firstNote(evt) {
        // Opens a new note for edit and removes the button that invoked this action.
        if (evt !== undefined) {
            evt.target.parentElement.removeChild(evt.target);
        }
        currentNote = notes.length;
        window.location.hash = 'edit';
    }

    function noteDelete(evt) {
        // Deletes current note if confirmed.
        if (evt !== undefined) {
            evt.preventDefault();
        }
        menuView.style.display = 'none';
        if (window.confirm('Delete this note?')) {
            notes.splice(currentNote, 1);
            localStorage.setItem('data', JSON.stringify(notes));
            window.history.back();
        }
    }

    /*
    // REMOVED: jsPDF doesn't supports ruby mark correctly yet. Code left for future possible implementation.
    function noteDownloadAsPdf(evt) {
        // Creates a PDF document for download with the current note content.
        if (evt !== undefined) {
            evt.preventDefault();
        }
        menuView.style.display = 'none';
        var pdf = new jsPDF('p', 'pt', 'letter');
        pdf.fromHTML(content, 15, 15);
        pdf.save();
    }
    */

    function notePrint(evt) {
        // Opens print dialog for current note.
        if (evt !== undefined) {
            evt.preventDefault();
        }
        menuView.style.display = 'none';
        window.print();
    }

    function noteView(evt) {
        // Opens selected note for viewing.
        currentNote = evt.target.index;
        window.location.hash = 'view';
    }

    function setMenuHome() {
        var anchor,
            li;

        menuHome = document.createElement('ul');
        menuHome.setAttribute('id', 'menuHome');

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

    function setOptions() {
        var evens = [],
            i,
            l,
            odds = [],
            regexOptions = [];
        options = localStorage.getItem('options');

        if (options === null) {
            options = {
                bracketsFullWidthParenthesis: true,
                bracketsParenthesis: true,
                fullWidthParenthesis: true,
                parenthesis: true
            };
        }

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
            replaceRegExp = '';
            replaceResult = '';
        }

        //window.console.log(replaceRegExp, replaceResult);
    }

    function setPageOptions() {
        //
    }

    function onHashChange() {
        var button,
            collectionItem,
            i,
            l;

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
            pageOptions.style.display = 'none';

            leftBarButton.title = 'Cancel';
            leftBarButton.style.backgroundImage = 'url("images/ic_cancel_white_24px.svg")';
            rightBarButton.title = 'Done';
            rightBarButton.style.backgroundImage = 'url("images/ic_done_white_24px.svg")';

            editTextarea.focus();
            break;
        case '#options':
            currentPage = PAGE_ABOUT;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = 'none';
            editContainer.style.display = 'none';
            pageOptions.style.display = '';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = '';
            rightBarButton.style.backgroundImage = 'none';
            break;
        case '#view':
            if (currentPage === PAGE_EDIT) {
                if (cancelEdit) {
                    cancelEdit = false;
                    if (notes[currentNote].length !== editTextarea.value.length) {
                        if (!window.confirm('Exit without save?')) {
                            window.location.hash = 'edit';
                            return;
                        }
                    }
                } else {
                    if (editTextarea.value.length > 0) {
                        notes.splice(currentNote, 1);
                        notes.unshift(editTextarea.value);
                        currentNote = 0;
                        localStorage.setItem('data', JSON.stringify(notes));
                    } else if (window.confirm('Delete this note?')) {
                        notes.splice(currentNote, 1);
                        localStorage.setItem('data', JSON.stringify(notes));
                        window.history.back();
                        return;
                    }
                }
            }
            if (currentNote < notes.length && notes[currentNote].length > 0) {
                content.innerHTML = '<p>' + notes[currentNote].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(replaceRegExp, replaceResult).replace(/\n/g, '&nbsp;</p><p>') + '</p>';
            } else {
                window.history.back();
            }
            currentPage = PAGE_VIEW;
            about.style.display = 'none';
            collectionView.style.display = 'none';
            content.style.display = '';
            editContainer.style.display = 'none';
            pageOptions.style.display = 'none';

            leftBarButton.title = 'Back';
            leftBarButton.style.backgroundImage = 'url("images/ic_arrow_back_white_24px.svg")';
            rightBarButton.title = 'Edit';
            rightBarButton.style.backgroundImage = 'url("images/ic_more_vert_white_24px.svg")';
            break;
        default:
            if (currentPage === PAGE_EDIT) {
                if (cancelEdit) {
                    cancelEdit = false;
                    if (!window.confirm('Exit without save?')) {
                        window.location.hash = 'edit';
                        return;
                    }
                } else if (editTextarea.value.length > 0) {
                    notes.unshift(editTextarea.value);
                    currentNote = 0;
                    localStorage.setItem('data', JSON.stringify(notes));
                    window.location.hash = 'view';
                }
            }
            currentPage = PAGE_HOME;
            about.style.display = 'none';
            collectionView.style.display = '';
            content.style.display = 'none';
            editContainer.style.display = 'none';
            pageOptions.style.display = 'none';

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
        collectionView = document.createElement('div');
        content = document.createElement('div');
        editContainer = document.createElement('div');
        editTextarea = document.createElement('textarea');
        leftBarButton = document.getElementById('leftBarButton');
        mainSection = document.getElementById('mainSection');
        menuContainer = document.createElement('div');
        pageOptions = document.createElement('div');
        rightBarButton = document.getElementById('rightBarButton');

        setOptions();

        if (data !== null) {
            notes = JSON.parse(data);
        }

        content.setAttribute('id', 'content');
        editContainer.setAttribute('id', 'editContainer');
        editTextarea.setAttribute('id', 'editTextarea');
        editTextarea.setAttribute('placeholder', '振（ふ）り仮（が）名（な）\n[日](に)[本](ほん)[語](ご)');
        collectionView.setAttribute('id', 'collectionView');
        menuContainer.setAttribute('id', 'menuContainer');
        pageOptions.setAttribute('id', 'options');

        preload.parentElement.removeChild(preload);
        editContainer.appendChild(editTextarea);
        mainSection.appendChild(content);
        mainSection.appendChild(editContainer);
        mainSection.appendChild(collectionView);
        mainSection.appendChild(menuContainer);
        mainSection.append(pageOptions);

        setMenuHome();
        mainSection.appendChild(menuHome);

        setMenuView();
        menuContainer.appendChild(menuView);

        setPageOptions();

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
