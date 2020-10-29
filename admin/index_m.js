var colors = [];
var defaultColors = [];

var fonts = [];
var defaultFonts = [];

var fontSizes = [];
var defaultFontSizes = [];

var myNamespace;

// This will be called by the admin adapter when the settings page loads
async function load(settings, onChange) {
    // example: select elements with id=key and class=value and insert value
    if (!settings) return;

    myNamespace = `${adapter}.${instance}`;

    $('.value').each(function () {
        var $key = $(this);
        var id = $key.attr('id');
        if ($key.attr('type') === 'checkbox') {
            // do not call onChange direct, because onChange could expect some arguments
            $key.prop('checked', settings[id])
                .on('change', () => onChange())
                ;
        } else {
            // do not call onChange direct, because onChange could expect some arguments
            $key.val(settings[id])
                .on('change', () => onChange())
                .on('keyup', () => onChange())
                ;
        }
    });
    onChange(false);

    colors = settings.colors || [];
    fonts = settings.fonts || [];

    globalScriptEnable();
    createColorsTab(onChange, settings);
    createFontsTab(onChange, settings);

    eventsHandler(onChange);

    // reinitialize all the Materialize labels on the page if you are dynamically adding inputs:
    if (M) M.updateTextFields();
}

//#region Tab Fonts
async function createFontsTab(onChange, settings) {
    console.log('createFontsTab');

    let themeType = 'fonts';
    let defaultFontsButtons = "";

    // check if defaultColors exist and number are equals
    defaultFonts = await loadDefaults(themeType, settings);

    // check if all fonts exist in settings
    fonts = await checkAllObjectsExistInSettings(themeType, fonts, defaultFonts, onChange);

    $(`.${themeType}DefaultContainer`).empty();
    for (var i = 0; i <= defaultFonts.length - 1; i++) {
        defaultFontsButtons += `${i} `;

        // create Default elements
        createDefaultElement(themeType, defaultFonts, i);
    }
}
//#endregion





//#region Tab Colors
async function createColorsTab(onChange, settings, reset = false) {
    try {
        console.log('createColorsTab');
        let themeType = 'colors';
        let defaultColorsButtons = "";

        // check if defaultColors exist and number are equals
        if (!reset) defaultColors = await loadDefaults(themeType, settings);

        // check if all colors exist in settings
        if (!reset) fonts = await checkAllObjectsExistInSettings(themeType, colors, defaultColors, onChange);

        $(`.${themeType}DefaultContainer`).empty();
        for (var i = 0; i <= defaultColors.length - 1; i++) {
            defaultColorsButtons += `${i} `;

            // create Default elements
            createDefaultElement(themeType, defaultColors, i);
            createColorPicker(`#colorsPicker${i}`, defaultColors[i], $(`#${themeType}${i}`), onChange, i);

            $(`#${themeType}${i}`).change(function () {
                // default input: color changed -> fires only on key enter or lost focus -> change colorPicker
                let inputEl = $(this);
                let inputVal = inputEl.val();
                let index = inputEl.attr('id').replace(themeType, '');

                console.log(`input: ${themeType}${index}`);

                defaultColors[index] = inputVal;

                let pickrEl = $(`#colorsPickerContainer${index} .pickr`);
                pickrEl.empty();
                let pickr = createColorPicker(pickrEl.get(0), inputVal, inputEl, onChange, index);

                setTimeout(function () {
                    if (!inputVal.startsWith('#') && !inputVal.startsWith('rgb')) {
                        // convert color names to hex
                        let convertedColor = pickr._color.toHEXA().toString();
                        inputEl.val(convertedColor);
                        defaultColors[index] = convertedColor;
                    }

                    colors = table2values(themeType);
                    for (var d in colors) {
                        if (colors[d].defaultValue === index) {
                            colors[d].value = defaultColors[index];
                        }
                    }

                    createColorsTable(colors, onChange, defaultColorsButtons);
                }, 100);

                onChange();
            });
        }

        $(`#colorsTableFilterClear`).hide();

        createColorsTable(colors, onChange, defaultColorsButtons);
        eventsHandlerColorsTab(onChange, settings);

    } catch (err) {
        console.error(`[createColorsTab] error: ${err.message}, stack: ${err.stack}`);
    }
}

async function createColorsTable(data, onChange, defaultColorsButtons) {
    try {
        console.log('createColorsTable');
        $('.container_colorsTable').empty();

        let element = `<div class="col s12" id="colors">
                    <div class="table-values-div" style="margin-top: 10px;">
                        <table class="table-values" id="colorsTable">
                            <thead>
                                <tr>
                                    <th data-name="widget" style="width: 15%;" class="translate" data-type="text">${_("Widget")}</th>
                                    <th data-name="id" style="width: 15%;" data-style="cursor: copy" class="translate" data-type="text">${_("datapoint")}</th>
                                    <th data-name="pickr" style="width: 30px;" data-style="text-align: center;" class="translate" data-type="text"></th>
                                    <th data-name="value" style="width: 160px;" data-style="text-align: left;" class="translate" data-type="text">${_("color")}</th>
                                    <th style="width: 120px; text-align: center;" class="header" data-buttons="${defaultColorsButtons.trim()}">${_('colorDefault')}</th>
                                    <th data-name="desc" style="width: auto;" class="translate" data-type="text">${_("description")}</th>
                                    <th data-name="defaultValue" style="display: none;" class="translate" data-type="text">${_('colorDefault')}</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>`

        $('.container_colorsTable').html(element);

        values2table('colors', data, onChange);

        // Input readonly machen
        $('#colorsTable [data-name=widget]').prop('readOnly', true);
        $('#colorsTable [data-name=id]').prop('readOnly', true);
        $('#colorsTable [data-name=desc]').prop('readOnly', true);

        // defaultcolor ausblenden
        $('#colorsTable [data-name=defaultValue]').closest('td').css('display', 'none');

        $('#colorsTable input[data-name=pickr]').each(function (i) {
            // create ColorPicker for rows & 
            let inpuEl = $(`#colorsTable input[data-index=${i}][data-name="value"]`);
            if (data[i].value) {
                createColorPicker(this, data[i].value, inpuEl, onChange);
            } else {
                createColorPicker(this, defaultColors[data[i].defaultValue], inpuEl, onChange);
            }

            setTableSelectedDefaultColor(i, data[i].defaultValue);
        });

        for (var i = 0; i <= defaultColors.length - 1; i++) {
            // Button Layout & Click event
            let btn = $(`#colorsTable [data-command="${i}"]`);
            btn.find('.material-icons').each(function (index) {
                $(this).text(i.toString()).removeClass('material-icons');

            });

            btn.on('click', function () {
                // apply default colors to row
                let rowNum = $(this).data('index');
                let btnNum = $(this).data('command');;

                // We have to recreate the color picker
                let pickrEl = $(`#colorsTable tr[data-index=${rowNum}] .pickr`);
                let inpuEl = $(`#colorsTable input[data-index=${rowNum}][data-name="value"]`);
                pickrEl.empty();
                createColorPicker(pickrEl.get(0), defaultColors[btnNum], inpuEl, onChange);
                inpuEl.val(defaultColors[btnNum]);

                setTableSelectedDefaultColor(rowNum, btnNum);

                onChange();
            })
        }

        $('#colorsTable input[data-name=value]').change(function () {
            // fires only on key enter or lost focus -> change colorPicker            
            let inputEl = $(this);
            let rowNum = inputEl.data('index');

            console.log(`input: row${rowNum}`);

            let pickrEl = $(`#colorsTable tr[data-index=${rowNum}] .pickr`);
            pickrEl.empty();

            let pickr = createColorPicker(pickrEl.get(0), inputEl.val(), inputEl, onChange);

            setTimeout(function () {
                if (!inputEl.val().startsWith('#') && !inputEl.val().startsWith('rgb')) {
                    // convert color names to hex
                    let convertedColor = pickr._color.toHEXA().toString();
                    inputEl.val(convertedColor);
                }
            }, 100);

            $(`#colorsTable input[data-index=${rowNum}][data-name="defaultValue"]`).val('');
            $(`#colorsTable .values-buttons[data-index=${rowNum}]`).css('background-color', '#2196f3');
        });

        $('#colorsTable input[data-name=id]').click(function () {
            clipboard.writeText(`{${myNamespace}.colors.${$(this).val()}}`);
            M.Toast.dismissAll();
            M.toast({ html: _('copied to clipboard'), displayLength: 700, inDuration: 0, outDuration: 0, classes: 'rounded' });
        });

    } catch (err) {
        console.error(`[createColorsTable] error: ${err.message}, stack: ${err.stack}`);
    }
}

function createColorPicker(el, color, inputEl, onChange, defaultColorIndex = 0) {
    let pickr = Pickr.create({
        el: el,
        theme: 'monolith', // or 'monolith', or 'nano'
        default: color,     // init color
        silent: false,

        swatches: [
            'black',
            'white',
            'blue',
            'magenta',
            'red',
            'yellow',
            'green',
            'cyan',
        ],
        outputPrecision: 0,
        comparison: false,

        components: {

            // Main components
            preview: true,
            opacity: true,
            hue: true,

            // Input / output Options
            interaction: {
                hex: true,
                rgba: true,
                input: true,
                cancel: true,
            }
        },
        i18n: {
            'btn:cancel': _('undo')
        }
    }).on('hide', instance => {
        let selectedColor = ''
        if (instance._representation === 'HEXA') {
            selectedColor = instance._color.toHEXA().toString();
        } else {
            selectedColor = instance._color.toRGBA().toString(0)
        }

        inputEl.val(selectedColor);
        inputEl.get(0).dispatchEvent(new Event('change'));

        if (defaultColorIndex > 0) {
            defaultColors[defaultColorIndex] = selectedColor;
        }

        onChange();
    });

    return pickr;
}

function setTableSelectedDefaultColor(rowNum, btnNum) {
    $(`#colorsTable input[data-index=${rowNum}][data-name="defaultValue"]`).val(btnNum);

    $(`#colorsTable .values-buttons[data-index=${rowNum}]`).css('background-color', '#2196f3');
    $(`#colorsTable .values-buttons[data-index=${rowNum}][data-command="${btnNum}"]`).css('background-color', 'green');
}

function eventsHandlerColorsTab(onChange, settings) {
    $('#colorsReset').on('click', function () {
        confirmMessage(_('Do you want to restore the default colors?'), _('attention'), null, [_('Cancel'), _('OK')], async function (result) {
            if (result === 1) {

                // reset defaultColors
                defaultColors = await getJsonObjects('defaultcolors');
                for (var i = 0; i <= defaultColors.length - 1; i++) {
                    let inputEl = $(`#colors${i}`);
                    inputEl.val(defaultColors[i]);
                }

                // reset table colors
                colors = await getJsonObjects('colors');
                for (var i = 0; i <= colors.length - 1; i++) {
                    if (!colors[i].value) {
                        colors[i].value = defaultColors[colors[i].defaultValue];
                    }

                    colors[i].desc = _(colors[i].desc);
                }

                await createColorsTab(onChange, settings, true);

                onChange();
            }
        });
    });

    $(`#colorsTableFilter`).keyup(function () {
        let filter = $(this).val();
        if (filter.length > 0) {
            $(`#colorsTableFilterClear`).show();
            $('#colorsTable input[data-name=widget]').each(function () {
                if (!$(this).val().toUpperCase().includes(filter.toUpperCase())) {
                    $(this).closest('tr').hide();
                }
            });
        } else {
            $(`#colorsTable`).find('tr:gt(0)').show(); // show all rows
            $(`#colorsTableFilterClear`).hide(); // hide button
        }
    });

    $(`#colorsTableFilterClear`).click(function () {
        $(`#colorsTableFilter`).val(''); // empty field
        $(`#colorsTable`).find('tr:gt(0)').show(); // show all rows
        $(`#colorsTableFilterClear`).hide(); // hide button
    });
}
//#endregion

function eventsHandler(onChange) {
    $('#generateGlobalScript').on('change', function () {
        globalScriptEnable();
    });
}

function globalScriptEnable() {
    if ($("#generateGlobalScript").prop('checked')) {
        $('#scriptName').prop("disabled", false);
        $('#variableName').prop("disabled", false);
    } else {
        $('#scriptName').prop("disabled", true);
        $('#variableName').prop("disabled", true);
    }
}

// This will be called by the admin adapter when the user presses the save button
function save(callback) {
    // example: select elements with class=value and build settings object
    var obj = {};
    $('.value').each(function () {
        var $this = $(this);
        if ($this.attr('type') === 'checkbox') {
            obj[$this.attr('id')] = $this.prop('checked');
        } else {
            obj[$this.attr('id')] = $this.val();
        }
    });

    colors = table2values('colors');
    obj.colors = colors;

    obj.defaultcolors = defaultColors;

    storeStates();

    callback(obj);
}

async function storeStates() {
    try {
        for (const color of colors) {
            setStateString(`${myNamespace}.colors.${color.id}`, color.desc, color.value);
        }

        for (var i = 0; i <= defaultColors.length - 1; i++) {
            setStateString(`${myNamespace}.colors.default.${i}`, `${_('colorsDefault')} ${i}`, defaultColors[i]);
        }

        for (const font of fonts) {
            setStateString(`${myNamespace}.fonts.${font.id}`, font.desc, font.value);
        }

        for (var i = 0; i <= defaultFonts.length - 1; i++) {
            setStateString(`${myNamespace}.fonts.default.${i}`, `${_('fontsDefault')} ${i}`, defaultFonts[i]);
        }

    } catch (err) {
        console.error(`[storeStates] error: ${err.message}, stack: ${err.stack}`)
    }
}

async function loadDefaults(themeType, settings) {
    try {
        let result = [];

        // check if default colors / fonts / sizes exist and number are equals
        let jsonDefaults = await getJsonObjects(`default${themeType}`);
        if (settings[`default${themeType}`].length === 0) {
            result = jsonDefaults;
        } else if (settings[`default${themeType}`].length !== jsonDefaults.length) {
            for (var i = 0; i <= jsonDefaults.length - 1; i++) {
                result[i] = settings[`default${themeType}`][i] || jsonDefaults[i];
            }
        } else {
            result = settings[`default${themeType}`];
        }

        return result;
    } catch (err) {
        console.error(`[loadDefaults] themeType: ${themeType}, error: ${err.message}, stack: ${err.stack}`);
    }
}

async function checkAllObjectsExistInSettings(themeType, themeObject, themeDefaults, onChange) {
    try {
        // check if all objects exist in settings
        let jsonList = await getJsonObjects(themeType);
        for (var i = 0; i <= jsonList.length - 1; i++) {
            if (!themeObject.find(o => o.id === jsonList[i].id)) {
                // not exist -> add to settings list
                if (!jsonList[i].value) {
                    jsonList[i].value = themeDefaults[jsonList[i].defaultValue];
                }
                themeObject.splice(i, 0, jsonList[i]);

                onChange();
            }
        }

        for (const obj of themeObject) {
            obj.desc = _(obj.desc);
        }

        return themeObject;

    } catch (err) {
        console.error(`[checkAllObjectsExistInSettings] themeType: ${themeType}, error: ${err.message}, stack: ${err.stack}`);
    }
}

function createDefaultElement(themeType, themeDefaults, index) {
    try {
        $(`.${themeType}DefaultContainer`).append(`
            <div class="col s12 m6 l3 defaultContainer" id="${themeType}PickerContainer${index}">
                <label for="${themeType}${index}" id="${themeType}Input${index}" class="translate defaultLabel">${_(`${themeType}Default`)} ${index}</label>
                ${themeType === 'colors' ? `<div class="${themeType}Picker" id="${themeType}Picker${index}"></div>` : ''}
                <input type="text" class="value ${themeType}PickerInput" id="${themeType}${index}" value="${themeDefaults[index]}" />
            </div>`);
    } catch (err) {
        console.error(`[createDefaultElement] themeType: ${themeType}, error: ${err.message}, stack: ${err.stack}`);
    }
}

/**
 * @param {string} id
 * @param {string} name
 */
async function setStateString(id, name, val, ack = true) {
    let obj = await this.getObjectAsync(id);

    if (obj) {
        if (obj.common.name !== _(name)) {
            obj.common.name = _(name);
            await this.setObjectAsync(id, obj);
        }
    } else {
        await this.setObjectAsync(id,
            {
                type: 'state',
                common: {
                    name: _(name),
                    desc: _(name),
                    type: 'string',
                    read: true,
                    write: false,
                    role: 'value'
                },
                native: {}
            });
    }

    await setStateAsync(id, val, ack);
}

async function getForeignObjectsAsync(pattern) {
    return new Promise((resolve, reject) => {
        socket.emit('getForeignObjects', pattern, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function getObjectAsync(id) {
    return new Promise((resolve, reject) => {
        socket.emit('getObject', id, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function setObjectAsync(id, obj) {
    return new Promise((resolve, reject) => {
        socket.emit('setObject', id, obj, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function setStateAsync(id, val, ack = false) {
    return new Promise((resolve, reject) => {
        socket.emit('setState', id, val, ack, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function getJsonObjects(lib) {
    return new Promise((resolve, reject) => {
        $.getJSON(`./lib/${lib}.json`, function (json) {
            if (json) {
                resolve(json);
            } else {
                resolve(null);
            }
        });
    });
}