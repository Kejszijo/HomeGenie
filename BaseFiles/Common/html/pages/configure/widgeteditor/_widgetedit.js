HG.WebApp.WidgetEditor = HG.WebApp.WidgetEditor || {};
HG.WebApp.WidgetEditor.PageId = 'page_widgeteditor_editwidget';
HG.WebApp.WidgetEditor._hasError = false;
HG.WebApp.WidgetEditor._editorHtml = null;
HG.WebApp.WidgetEditor._editorJscript = null;
HG.WebApp.WidgetEditor._widgetInstance = null;
HG.WebApp.WidgetEditor._previewHeight = 245;
HG.WebApp.WidgetEditor._splitDragStartY = 0;
HG.WebApp.WidgetEditor._savePromptCallback = null;


HG.WebApp.WidgetEditor.InitializePage = function () {
    var page = $('#'+HG.WebApp.WidgetEditor.PageId);
    var runPreviewButton = page.find('[data-ui-field=preview-btn]');
    var bindModuleSelect = page.find('[data-ui-field=bindmodule-sel]');
    var editParamsButton = page.find('[data-ui-field=module-params-edit]');
    var errorsButton = page.find('[data-ui-field=errors-btn]');
    var saveButton = page.find('[data-ui-field=save-btn]');
    var exportButton = page.find('[data-ui-field=export-btn]');
    var deleteButton = page.find('[data-ui-field=delete-btn]');
    var deleteConfirmButton = page.find('[data-ui-field=deleteconfirm-btn]');
    var deletePopup = page.find('[data-ui-field=delete-popup]');
    var previewPanel = page.find('[data-ui-field=preview-panel]');
    var splitBar = page.find('[data-ui-field=split-bar]');
    var backButton = page.find('[data-ui-field=back-btn]');
    var homeButton = page.find('[data-ui-field=home-btn]');
    var notSavedPopup = page.find('[data-ui-field=notsaved-popup]');
    var saveConfirmButton = page.find('[data-ui-field=saveconfirm-btn]');
    var saveCancelButton = page.find('[data-ui-field=savecancel-btn]');
  
    page.on('pagehide', function (e) {
        $('[data-ui-field=homegenie_panel_button]').removeClass('ui-disabled');
    });
    page.on('pageshow', function (e) {
        $('[data-ui-field=homegenie_panel_button]').addClass('ui-disabled');
    });
    page.on('pageinit', function (e) {
        HG.WebApp.WidgetEditor._editorHtml = CodeMirror.fromTextArea(document.getElementById('widgeteditor_code_html'), {
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys: {
                "Ctrl-S": function (cm) { HG.WebApp.WidgetEditor.SaveWidget(function(){
                    HG.WebApp.WidgetEditor._editorHtml.markClean();
                    HG.WebApp.WidgetEditor._editorJscript.markClean();
                }); },
                "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
                "Ctrl-Space": "autocomplete"
            },
            foldGutter: true,
            gutters: ["CodeMirror-lint-markers-4", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            highlightSelectionMatches: { showToken: /\w/ },
            mode: "text/html",
            matchTags: {bothTags: true},
            theme: 'ambiance'
        });
        HG.WebApp.WidgetEditor._editorJscript = CodeMirror.fromTextArea(document.getElementById('widgeteditor_code_javascript'), {
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys: {
                "Ctrl-S": function (cm) { HG.WebApp.WidgetEditor.SaveWidget(function(){
                        HG.WebApp.WidgetEditor._editorHtml.markClean();
                        HG.WebApp.WidgetEditor._editorJscript.markClean();
                    }); 
                },
                "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
                "Ctrl-Space": "autocomplete"
            },
            foldGutter: true,
            gutters: ["CodeMirror-lint-markers-5", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            highlightSelectionMatches: { showToken: /\w/ },
            mode: "text/javascript",
            theme: 'ambiance'
        });    
        deletePopup.popup();
        notSavedPopup.popup();
    });
    page.on('pagebeforeshow', function (e) {
        page.find('[data-ui-field=title-heading]').html('<span style="font-size:10pt;font-weight:bold">' + HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_title', false, this.Locale) + '</span><br/>' + HG.WebApp.WidgetsList._currentWidget);
        // standard editor/preview size
        page.find('.CodeMirror').css('bottom', (HG.WebApp.WidgetEditor._previewHeight + 5)+'px');
        previewPanel.height(HG.WebApp.WidgetEditor._previewHeight);
        
        // load widget html/js
        $.ajax({
            url: '/hg/html/pages/control/widgets/' + HG.WebApp.WidgetsList._currentWidget + '.html',
            type: 'GET',
            dataType: 'text',
            success: function (data) {
                HG.WebApp.WidgetEditor._editorHtml.setValue(data);
                HG.WebApp.WidgetEditor._editorHtml.clearHistory();
                HG.WebApp.WidgetEditor._editorHtml.markClean();
                $.ajax({
                    url: '/hg/html/pages/control/widgets/' + HG.WebApp.WidgetsList._currentWidget + '.js',
                    type: 'GET',
                    dataType: 'text',
                    success: function (data) {
                        HG.WebApp.WidgetEditor._editorJscript.setValue(data);
                        HG.WebApp.WidgetEditor._editorJscript.clearHistory();
                        HG.WebApp.WidgetEditor._editorJscript.markClean();
                        HG.WebApp.WidgetEditor.RefreshCodeMirror();
                    }
                });
            }
        });
        
        // initially the user have to press Run/Preview button in order to activate the widget
        page.find('[data-ui-field=preview-div]').empty();
        HG.WebApp.WidgetEditor._hasError = true;
        // populate "bind module" select menu
        var bindModuleSelect = page.find('[data-ui-field=bindmodule-sel]');
        bindModuleSelect.empty();
        bindModuleSelect.append('<option value="">' + HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_selectmodule_placeholder', false, this.Locale) + '</option>');
        var selected = '', selectedDomain = '';
        for (var m = 0; m < HG.WebApp.Data.Modules.length; m++)
        {
            var module = HG.WebApp.Data.Modules[m];
            var widget = HG.WebApp.Utility.GetModulePropertyByName(module, 'Widget.DisplayModule');
            if (widget != null) widget = widget.Value;
            var devType = module.DeviceType.toLowerCase();
            var widgetType = HG.WebApp.WidgetsList._currentWidget.toLowerCase().split('/');
            widgetType = widgetType[widgetType.length-1];
            if (widget == HG.WebApp.WidgetsList._currentWidget || widgetType == devType)
            {
                selected = m;
                // prefer modules to programs as default bind module
                if (module.Domain != 'HomeAutomation.HomeGenie.Automation') break;
            }
        }
        // if no valid bind module has been found then put in the list all module
        // otherwise only those having a matching widget
        for (var m = 0; m < HG.WebApp.Data.Modules.length; m++)
        {
            var module = HG.WebApp.Data.Modules[m];
            var name = module.Name.trim();
            if (name == '')
            {
                name = module.Domain + ':' + module.Address;
            }
            var widget = HG.WebApp.Utility.GetModulePropertyByName(module, 'Widget.DisplayModule');
            if (widget != null) widget = widget.Value;
            var devType = module.DeviceType.toLowerCase();
            var widgetType = HG.WebApp.WidgetsList._currentWidget.toLowerCase().split('/');
            widgetType = widgetType[widgetType.length-1];
            if (widget == HG.WebApp.WidgetsList._currentWidget || widgetType == devType || selected == '')
            {
                bindModuleSelect.append('<option value="' + m + '">' + name + '</option>');
            }
        }
        bindModuleSelect.trigger('create');
        bindModuleSelect.val(selected);
        bindModuleSelect.selectmenu('refresh');
        HG.WebApp.WidgetEditor.SetTab(1);
        if (selected != '' || selected == '0') {
            setTimeout(function(){
                HG.WebApp.WidgetEditor.Run();
            }, 1000);
        } else {
            bindModuleSelect.qtip({
                content: {
                    title: HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_nobindmodule_title', 'Select a module'),
                    text: HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_nobindmodule_text', 'No valid bind-module has been found, please select one.'),
                    button: HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_nobindmodule_close', 'Close')
                },
                show: { event: false, ready: true, delay: 1000 },
                events: {
                    hide: function () {
                        $(this).qtip('destroy');
                    }
                },
                hide: { event: false, inactive: 3000 },
                style: { classes: 'qtip-red qtip-shadow qtip-rounded qtip-bootstrap' },
                position: { my: 'bottom center', at: 'top center' }
            });        
        }
    });
        
    saveButton.bind('click', function(){
        $('#editwidget_actionmenu').popup('close');
        // save html and javascript
        HG.WebApp.WidgetEditor.SaveWidget(function(){
            HG.WebApp.WidgetEditor._editorHtml.markClean();
            HG.WebApp.WidgetEditor._editorJscript.markClean();
        });
    });
    
    exportButton.bind('click', function(){
        $('#editwidget_actionmenu').popup('close');
        // export current widget
        //HG.Configure.Widgets.Export(HG.WebApp.WidgetsList._currentWidget)
        window.open(location.protocol + '../../api/HomeAutomation.HomeGenie/Config/Widgets.Export/' + encodeURIComponent(HG.WebApp.WidgetsList._currentWidget) + '/');
    });
    
    deleteButton.bind('click', function(){
        HG.Ui.SwitchPopup('#editwidget_actionmenu', deletePopup);
    });
    deleteConfirmButton.bind('click', function(){
        $.mobile.loading('show', { text: 'Deleting Widget...', textVisible: true, theme: 'a', html: '' });
        HG.Configure.Widgets.Delete(HG.WebApp.WidgetsList._currentWidget, function(res) { 
            $.mobile.loading('hide');
            $.mobile.pageContainer.pagecontainer('change', '#'+HG.WebApp.WidgetsList.PageId);
        });
        return false;
    });
    
    backButton.bind('click', function(){
        HG.WebApp.WidgetEditor.CheckIsClean(function () {
            $.mobile.pageContainer.pagecontainer('change', '#'+HG.WebApp.WidgetsList.PageId);
        });
        return false;
    });
    homeButton.bind('click', function(){
        HG.WebApp.WidgetEditor.CheckIsClean(function () {
            $.mobile.pageContainer.pagecontainer('change', '#page_control');
        });
        return false;
    });
    saveCancelButton.bind('click', function(){
        HG.WebApp.WidgetEditor._savePromptCallback();
        return false;
    });
    saveConfirmButton.bind('click', function(){
        HG.WebApp.WidgetEditor.SaveWidget(function () {
            HG.WebApp.WidgetEditor._savePromptCallback();
        });
        return false;
    });
    
    runPreviewButton.bind('click', function(){
        HG.WebApp.WidgetEditor.Run();
    });
    bindModuleSelect.on('change', function(){
        if ($(this).val() == '')
            editParamsButton.addClass('ui-disabled');
        else
            editParamsButton.removeClass('ui-disabled');
        HG.WebApp.WidgetEditor.RenderView();
    });
    editParamsButton.on('click', function(){
        if (bindModuleSelect.val() != '') {
            var module = HG.WebApp.Data.Modules[bindModuleSelect.val()];
            HG.WebApp.Control.EditModuleParams(module);
        }
    }); 
    errorsButton.hide();
    
    splitBar.mousedown(function(event) {
        HG.WebApp.WidgetEditor._splitDragStartY = event.pageY;
        $(window).mousemove(function(ev) {
            var deltaY = HG.WebApp.WidgetEditor._splitDragStartY - ev.pageY;
            var maxHeight = page.height() / 2;
            var newHeight = (previewPanel.height() + deltaY);
            if (newHeight >= 5 && newHeight <= maxHeight)
            {
                previewPanel.height((previewPanel.height() + deltaY));
                page.find('.CodeMirror').css('bottom', (previewPanel.height() + 5)+'px');
                HG.WebApp.WidgetEditor._splitDragStartY = ev.pageY;
            }
            else
            {
                $(window).unbind("mousemove");
                HG.WebApp.WidgetEditor._editorHtml.refresh();
                HG.WebApp.WidgetEditor._editorJscript.refresh();
            }
        });
    })
    .mouseup(function() {
        $(window).unbind("mousemove");
        HG.WebApp.WidgetEditor._editorHtml.refresh();
        HG.WebApp.WidgetEditor._editorJscript.refresh();
    });
    
    window.onerror = function(msg, url, line, col, error) {
        if (url.indexOf('#'+HG.WebApp.WidgetEditor.PageId) > 0)
        {
            HG.WebApp.WidgetEditor.ShowError(error);
        }
        else
        {
            throw error;
        }
    };   
};

HG.WebApp.WidgetEditor.SetTab = function(tabIndex) {
    var page = $('#'+HG.WebApp.WidgetEditor.PageId);
    page.find('[data-ui-field=tab1-div]').hide();
    page.find('[data-ui-field=tab2-div]').hide();
    page.find('[data-ui-field=tab3-div]').hide();
    page.find('[data-ui-field=tab1-btn]').removeClass('ui-btn-active');
    page.find('[data-ui-field=tab2-btn]').removeClass('ui-btn-active');
    page.find('[data-ui-field=tab3-btn]').removeClass('ui-btn-active');
    page.find('[data-ui-field=tab' + tabIndex + '-div]').show();
    page.find('[data-ui-field=tab' + tabIndex + '-btn]').addClass('ui-btn-active');
    HG.WebApp.WidgetEditor.RefreshCodeMirror();
};

HG.WebApp.WidgetEditor.CheckIsClean = function(callback) {
    if (!HG.WebApp.WidgetEditor._editorHtml.isClean() || !HG.WebApp.WidgetEditor._editorJscript.isClean()) {
        var page = $('#'+HG.WebApp.WidgetEditor.PageId);
        HG.WebApp.WidgetEditor._savePromptCallback = function () {
            callback();
        }
        page.find('[data-ui-field=notsaved-popup]').popup('open');
    }
    else {
        callback();
    }
};

HG.WebApp.WidgetEditor.SaveWidget = function(callback) {
    HG.WebApp.WidgetEditor.SaveWidgetHtml(function() {
        HG.WebApp.WidgetEditor.SaveWidgetJavascript(function() {
            HG.WebApp.WidgetEditor.Run();
            if (callback) callback();
        });
    });
};
HG.WebApp.WidgetEditor.SaveWidgetHtml = function(callback) {
    $.mobile.loading('show', { text: HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_savinghtml', false, this.Locale), textVisible: true, theme: 'a', html: '' });
    HG.Configure.Widgets.Save(HG.WebApp.WidgetsList._currentWidget, 'html', HG.WebApp.WidgetEditor._editorHtml.getValue(), function(res) {
        $.mobile.loading('hide');
        if (callback) callback();
    });
};
HG.WebApp.WidgetEditor.SaveWidgetJavascript = function(callback) {
    $.mobile.loading('show', { text: HG.WebApp.Locales.GetLocaleString('configure_widgeteditor_savingjavascript', false, this.Locale), textVisible: true, theme: 'a', html: '' });
    HG.Configure.Widgets.Save(HG.WebApp.WidgetsList._currentWidget, 'js', HG.WebApp.WidgetEditor._editorJscript.getValue(), function(res) {
        $.mobile.loading('hide');
        if (callback) callback();
    });
};

HG.WebApp.WidgetEditor.RefreshCodeMirror = function() {
    setTimeout(function () {
        HG.WebApp.WidgetEditor._editorHtml.refresh();
        HG.WebApp.WidgetEditor._editorJscript.refresh();
    }, 500);                 
};

HG.WebApp.WidgetEditor.Render = function() {
    var page = $('#'+HG.WebApp.WidgetEditor.PageId);
    var bindModuleSelect = page.find('[data-ui-field=bindmodule-sel]');
    var errorsButton = page.find('[data-ui-field=errors-btn]');
    errorsButton.hide();
    var htmlCode = '<div id="widget_preview_instance" data-ui-field="preview-wrapper-div" align="left" style="display:table-cell">';
    htmlCode += HG.WebApp.WidgetEditor._editorHtml.getValue();
    htmlCode += '</div>';
    page.find('[data-ui-field=preview-div]').html(htmlCode);
    page.find('[data-ui-field=preview-wrapper-div]').trigger('create');
}

HG.WebApp.WidgetEditor.RenderView = function(eventData) {
    if (HG.WebApp.WidgetEditor._hasError) return;
    var page = $('#'+HG.WebApp.WidgetEditor.PageId);
    var bindModuleSelect = page.find('[data-ui-field=bindmodule-sel]');
    var module = HG.WebApp.Data.Modules[bindModuleSelect.val()];
    if (eventData != null && (eventData.Domain != module.Domain || eventData.Source != module.Address)) 
        return;
    HG.WebApp.WidgetEditor.RenderWidget('#widget_preview_instance', HG.WebApp.WidgetEditor._widgetInstance, module, eventData);
};

HG.WebApp.WidgetEditor.RenderWidget = function(cuid, widgetInstance, module, eventData) {
    try {
        if (widgetInstance.v2) {
            if (typeof widgetInstance._bind == 'function') {
                widgetInstance._bind(cuid, module);
                widgetInstance._bind = null;
            }
            if (typeof widgetInstance.onStart == 'function' && !widgetInstance._started) {
                widgetInstance.onStart();
                widgetInstance._started = true;
                if (typeof widgetInstance.onRefresh == 'function')
                    widgetInstance.onRefresh();
            }
            if (typeof eventData != 'undefined' && typeof eventData.Property != 'undefined' && typeof widgetInstance.onUpdate == 'function')
                widgetInstance.onUpdate(eventData.Property, eventData.Value);
            else if (typeof widgetInstance.onRefresh == 'function')
                widgetInstance.onRefresh();
        } else {
            widgetInstance.RenderView(cuid, module);
        }
    } catch (e) {
        console.log(e);
        HG.WebApp.WidgetEditor._hasError = true;
        HG.WebApp.WidgetEditor.ShowError(e);
    }
}

HG.WebApp.WidgetEditor.GetInstance = function(javascriptCode) {
    if (!javascriptCode.trim().startsWith('[')) {
        var commonJs = `
            var $$ = this;
            $$._fieldCache = [];
            $$.v2 = true;
            $$.apiCall = HG.Control.Modules.ServiceCall;
            $$.util = HG.WebApp.Utility;
            $$.ui = HG.Ui;
            $$.signalActity = function(fieldName) {
              if (typeof fieldName != 'undefined' && fieldName != '')
                $$.ui.BlinkAnim($$.field(fieldName));
              if ($$.field('led').length) {
                  $$.field('led').attr('src', 'images/common/led_green.png');
                  setTimeout(function() {
                    $$.field('led').attr('src', 'images/common/led_black.png');
                  }, 100);
              }
            };
            $$.field = function(f){ 
                if (typeof $$._fieldCache[f] == 'undefined')
                    $$._fieldCache[f] = $$._widget.find('[data-ui-field='+f+']');
                $$._fieldCache[f] = $$._widget.find('[data-ui-field='+f+']');
                return $$._fieldCache[f]; 
            };
            $$._bind = function(cuid, module) {
                $$.module = module;
                $$.module.prop = function(propName, value) {
                    var p = HG.WebApp.Utility.GetModulePropertyByName(this, propName);
                    if (typeof value != 'undefined')
                        p.Value = value;
                    return p;
                };
                $$.module.command = function(cmd, opt, callback) {
                    HG.Control.Modules.ServiceCall(cmd, this.Domain, this.Address, opt, function (response) { 
                        if (typeof callback == 'function')
                            callback(response);
                    });
                };
                $$.container = $(cuid);
                $$.popup = $$.container.find('[data-ui-field=controlpopup]');
                $$.popup.popup();
                $$.popup.trigger('create');
                $$.popup.field = function(f){ return $$.popup.find('[data-ui-field='+f+']'); };
                $$._widget = $$.container.find('[data-ui-field=widget]');
                $$._widget.data('ControlPopUp', $$.popup);
            };
        `;
        commonJs = commonJs.replace(/(\r\n|\n|\r)/gm,"");
        javascriptCode = 'new function(){' + commonJs + javascriptCode + '}';
        return eval(javascriptCode);
    } else {
        // old widget json format
        return eval(javascriptCode)[0];
    }
};

HG.WebApp.WidgetEditor.Run = function() {
    HG.WebApp.WidgetEditor._hasError = false;
    HG.WebApp.WidgetEditor._editorJscript.clearGutter('CodeMirror-lint-markers-5');
    // create widget instance
    var javascriptCode = HG.WebApp.WidgetEditor._editorJscript.getValue();
    $.mobile.loading('show', { text: 'Checking Javascript code...', textVisible: true, theme: 'a', html: '' });
    HG.Configure.Widgets.Parse(javascriptCode, function(msg) { 
        $.mobile.loading('hide');
        if (msg.ResponseValue != 'OK') {
            var message = msg.ResponseValue;
            var position = message.substr(message.indexOf('(') + 1);
            position = position.substr(0, position.indexOf(')')).split(',');
            message = message.substr(message.indexOf(':') + 2);
            message = message + '<br/> <a href="javascript:HG.WebApp.WidgetEditor.JumpToLine({ line: ' + (position[0] - 1) + ', ch: ' + (position[1] - 1) + ' })">Line <strong>' + position[0] + '</strong>, Column <strong>' + position[1] + '</strong></a>';
            HG.WebApp.WidgetEditor.ShowErrorTip(message, position[0]);
        } else {
            try {
                HG.WebApp.WidgetEditor._widgetInstance = HG.WebApp.WidgetEditor.GetInstance(javascriptCode);
                // render HTML
                HG.WebApp.WidgetEditor.Render();
                // execute widget RenderView method
                HG.WebApp.WidgetEditor.RenderView();
            } catch (e) {
                HG.WebApp.WidgetEditor._hasError = true;
                HG.WebApp.WidgetEditor.ShowError(e);
            }
        }
    });
};

HG.WebApp.WidgetEditor.ShowError = function(e) {
    var stack = ErrorStackParser.parse(e);
    if  (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        // FireFox already gives lineNumber and columnNumber properties in error object
        stack[0] = e;
    }
    var message = e + '<br/> <a href="javascript:HG.WebApp.WidgetEditor.JumpToLine({ line: ' + (stack[0].lineNumber - 1) + ', ch: ' + (stack[0].columnNumber - 1) + ' })">Line <strong>' + stack[0].lineNumber + '</strong>, Column <strong>' + stack[0].columnNumber + '</strong></a>';
    HG.WebApp.WidgetEditor.ShowErrorTip(message, stack[0].lineNumber);
    console.log(message);
    console.log(stack);
};

HG.WebApp.WidgetEditor.ShowErrorTip = function(message, lineNumber) {
    var page = $('#'+HG.WebApp.WidgetEditor.PageId);
    var errorsButton = page.find('[data-ui-field=errors-btn]');
    var marker = document.createElement('div');
    HG.WebApp.WidgetEditor.SetTab(2);
    HG.WebApp.WidgetEditor._editorJscript.clearGutter('CodeMirror-lint-markers-5');
    marker.className = 'CodeMirror-lint-marker-error';
    HG.WebApp.WidgetEditor._editorJscript.setGutterMarker(lineNumber - 1, 'CodeMirror-lint-markers-5', marker);
    $(marker).qtip({
        content: { title: 'Error', text: message, button: 'Close' },
        show: { event: 'mouseover', solo: true },
        hide: 'mouseout',
        style: { classes: 'qtip-red qtip-shadow qtip-rounded qtip-bootstrap' }
    });
    errorsButton.show();
    errorsButton.qtip({
        content: { title: 'Error', text: message, button: 'Close' },
        show: { event: 'mouseover', ready: true, delay: 500 },
        hide: { event: false, inactive: 5000 },
        style: { classes: 'qtip-red qtip-shadow qtip-rounded qtip-bootstrap' },
        position: { adjust: { screen: true }, my: 'top center', at: 'bottom center' }
    });
}

HG.WebApp.WidgetEditor.JumpToLine = function(position) {
    window.setTimeout(function () {
        HG.WebApp.WidgetEditor._editorJscript.setCursor(position);
        var myHeight = HG.WebApp.WidgetEditor._editorJscript.getScrollInfo().clientHeight; 
        var coords = HG.WebApp.WidgetEditor._editorJscript.charCoords(position, "local"); 
        HG.WebApp.WidgetEditor._editorJscript.scrollTo(null, (coords.top + coords.bottom - myHeight) / 2);             
        HG.WebApp.WidgetEditor._editorJscript.focus();
    }, 500);
};