/** 
 * Layer selector version 1.0
 * @author RyanCui
 */

(function($) {

    var LayerSelector = function(config, element) {
        var that = this;
        that.$element = element;
        that.config = $.extend({}, $.fn.layerselector.defaults, config);
        for (var i=0; i<that.config.layers.length; i++) {
            that.config.layers[i] = $.extend({}, $.fn.layerselector.defaultLayer, that.config.layers[i]);
        }

        that.layers = that.config.layers;
        that.layerCount = that.layers.length;   // How many layers
        init.call(that);
    };

    function init() {
        var that = this;
        that.initMain();
        that.bindEvent();
        // Show the data of top layer
        that.layerData[that.layers[0].field] = that.layers[0].dataProvider();
        that._addTab(0);
        that._hide();
    }

    LayerSelector.prototype = {
        constrcutor: LayerSelector,
        initMain: function() {
            var that = this;
            that.$element.textbox({
                // TODO More textbox attribute
                required: that.config.required || false,
                editable: false,
                icons: [{
                    iconCls:'icon-search',
                    handler: function(e) {
                        that._show();
                    }
                }]
            });
            that.$element.textbox('textbox').on('click', $.proxy(this._show, this));

            $('body').append('<div id="layerSelector" class="panel-body" style="width:' + (that.config.panelWidth+10) + 
                'px;height:' + (that.config.panelHeight+10) + 'px;position:relative;z-index:1000111;">' + 
                '<div id="tabs"></div></div>');

            that.$dialog = $("#layerSelector");
            that.$dialog.on('mouseover', 'ul.tabs>li',  function() {
                that.$tabs.tabs('select', $(this).index());
            });
            that.$dialog.on('mouseover', '.link', function() {
                $(this).addClass('calendar-nav-hover');
            });
            that.$dialog.on('mouseout', '.link', function() {
                $(this).removeClass('calendar-nav-hover');
            });

            // Multiple OK button click event
            that.$dialog.on('click', '.ok-button', function() {
                that._hide();
            });

            that.$tabs = $("#tabs");
            that.$tabs.tabs({
                border: false,
                width: that.config.panelWidth + 10,
                height: that.config.panelHeight + 10,
                onUpdate: function(title, layer) {
                    // Change CSS when multiple mode
                    if (that.config.multiple && layer==that.layerCount-1) {
                        var thisTab = that.$tabs.tabs('getTab', layer);
                        var $allLink = thisTab.panel('panel').find('.link');
                        $allLink.each(function(i, v) {
                            $(this).removeClass('calendar-selected');
                            var id = $(this).data('id'), has = false;
                            if (that.selected[that.layers[layer].field]) {
                                $.each(that.selected[that.layers[layer].field], function(i, v) {
                                    if (v[that.layers[layer].idField] == id) {
                                        has = true;
                                    }
                                });
                                has ? $(this).addClass('calendar-selected') : $(this).removeClass('calendar-selected');
                            }
                        });
                    }

                    // Format other textbox when there exists
                    if (that.layers[layer].otherItem(!layer ? null : that.selected[that.layers[layer-1].field])) {
                        that.$otherText = $("[name='othertext"+layer+"']");
                        that.$otherText.textbox({
                            buttonText: that.layers[layer].otherOkText,
                            onClickButton: function() {
                                var val = that.$otherText.textbox('getText'), data = {};
                                data[that.layers[layer].labelField] = val;
                                data[that.layers[layer].idField] = null;
                                that._onSelectLayer(layer, data);
                            }
                        });
                    }
                }
            });

            // Hide panel when click outside the panel
            $('html').on('mousedown', function(event) {
                // TODO When click the textbox or textbox-icon, the panel will flash,
                //      we should handle the event later
                if ($(event.target).closest('#layerSelector').length==0) {
                    that._hide();
                }
            });

            // The minimal width of one item
            that.columnWidth = Math.floor(that.config.panelWidth/that.config.column) - 5;
            that.layerData = {};        // Data in each layer
            that.selected = {};         // Selected Data in each layer
            that._resetSelectedData();
        },
        bindEvent: function() {
            var that = this;

            that.$dialog.on('click', '.link', function() {
                var $this = $(this),
                    id = $(this).data('id'),
                    tab = that.$tabs.tabs('getSelected'),           
                    layer = that.$tabs.tabs('getTabIndex', tab),
                    data = null;
                
                if (!id) {
                    if ($this.attr('class').indexOf('calendar-selected') > 0) {
                        data = {};
                        data[that.layers[layer].idField] = null;
                        that._onSelectLayer(layer, data);
                    } else {
                        that.$element.focus();
                    }
                    return;
                }
                
                // Find data according to id
                for (var i in that.layerData[that.layers[layer].field]) {
                    if ( that.layerData[that.layers[layer].field][i][that.layers[layer].idField] == id ) {
                        data = that.layerData[that.layers[layer].field][i];
                        break;
                    }
                }
                
                that._onSelectLayer(layer, data);

            });
        },
        _show: function() {
            var that = this, pos = that.$element.textbox('textbox').offset();
            // The exact constants here need to be adjusted due to different circumstances
            that.$dialog.css({
                'top': pos.top - 7 + that.$element.textbox('options').height,
                'left': pos.left - 9
            });
            that.$dialog.css({'display': 'block'});
        },
        _hide: function() {
            var that = this;
            that.$dialog.css({'display': 'none'});
        },
        /** 
         *  Add a tab in layer
         */
        _addTab: function(layer) {
            var that = this;
            that.$tabs.tabs('add', {
                title: that.layers[layer].prompt,
                content: that._generateContent(layer),
                selected: true
            });
        },
        /**
         * Generate the HTML code in layer
         * @param {Number} layer The layer number begin with 0
         * @return {String} HTML code
         */
        _generateContent: function(layer) {
            var that = this, 
                obj = that.layerData[that.layers[layer].field], 
                lineArr = [], line = '', ret = '', linePos = 1, colspan = 1;
            for (var i=0; i<obj.length; i++) {
                colspan = 1;
                while (obj[i][that.layers[layer].labelField].length * that.config.chracterPixels 
                    > that.columnWidth * colspan) {
                    colspan++;
                    linePos++;
                    if (colspan == that.config.column) {
                        break;
                    }
                }
                
                // The rest of the line cannot afford enough space for colspan
                // Then go to next line
                if (linePos > that.config.column) {
                    lineArr.push(line);
                    line = '';
                    linePos = colspan;
                }
                line += '<div style="width:' + that.columnWidth*colspan + 'px;"><label data-id="' + 
                    obj[i][that.layers[layer].idField] + '" class="link">' + 
                    obj[i][that.layers[layer].labelField] + '</label></div>';
                if (linePos%that.config.column == 0) {
                    lineArr.push(line);
                    line = '';
                    linePos = 1;
                } else {
                    linePos++;
                }
            }
            if (line) {
                lineArr.push(line);
            } 
            var items = '<div style="width:'+(that.config.panelWidth)+'px;" class="line"><span style="margin-left:10px;"></span>' + 
                lineArr.join('</div><div style="width:'+(that.config.panelWidth)+'px;" class="line"><span style="margin-left:10px;"></span>') + '</div>';
            
            // Other item exists?
            if (that.layers[layer].otherItem(layer==0 ? null : that.selected[that.layers[layer-1].field])) {
                var str = '<div style="width:'+(that.config.panelWidth)+'px;" class="line"><span style="margin-left:10px;"></span><div style="width:' + 
                    that.columnWidth +'px;"><label class="link">'+ that.layers[layer].otherText +'</label></div>' +
                    '<div style="width:'+ (that.columnWidth*(that.config.column-1)) +
                    'px;"><input name="othertext'+ layer +'" style="width:100%;"></div>' + 
                    '</div>';
                items += str;
            }

            
            
            // Add a OK button when in multiple mode
            if (that.config.multiple && layer==that.layerCount-1) {
                var okButton = '<div style="width:'+(that.config.panelWidth)+'px;text-align:center;vertical-align:middle;">' +
                    '<a href="javascript:void(0)" class="easyui-linkbutton ok-button" data-options="iconCls:\'icon-ok\'" ' +
                    'style="width:60px;">'+ that.config.okText +'</a></div></div>';
                ret += okButton;
                ret = '<div class="easyui-layout" data-options="fit:true"><div data-options="region:\'center\',border:false">'+items+'</div>' +
                    '<div data-options="region:\'south\',border:false" style="height:30px;">'+okButton+'</div></div>';
            } else {
                ret = '<div class="easyui-layout" data-options="fit:true"><div data-options="region:\'center\',border:false">'+items+'</div></div>';
            }
            return ret;
        },

        /** Reset the selected data to null or [] from sLayer to the end*/
        _resetSelectedData: function(sLayer) {
            sLayer = sLayer ? sLayer : 0;
            for (var i=sLayer; i<this.layers.length; i++) {
                if (this.config.multiple && i == this.layerCount - 1) {
                    this.selected[this.layers[i].field] = [];
                } else {
                    this.selected[this.layers[i].field] = null;
                }
            }
        },
        /** Close all tabs after sLayer */
        _resetTabs: function(sLayer) {
            sLayer = sLayer ? sLayer : 1;
            var allTabs = this.$tabs.tabs('tabs');
            for (var i=allTabs.length-1; i>=sLayer; i--) {
                this.$tabs.tabs('close', i);
            }
        },
        /**
         * Callback when select data in layer
         * @param layer
         * @param data
         */
        _onSelectLayer: function(layer, data) {
            var that = this, 
                newOption = false,      // If this selection is a new one
                isMultipleAndLastLayer = that.config.multiple && layer==that.layerCount-1;
            
            // Set the current selection into selected data
            if (isMultipleAndLastLayer) {
                var lastSelected = that.selected[that.layers[layer].field], origin = false; 

                // If already select before, then remove it
                for (var i=0; i<lastSelected.length; i++) {
                    if (lastSelected[i][that.layers[layer].idField] == data.id) {
                        origin = true;
                        that.selected[that.layers[layer].field] = 
                            [].concat(lastSelected.slice(0, i), lastSelected.slice(i+1));
                        break;
                    }
                }
                // If not select, then add it in selected data
                if (!origin) {
                    that.selected[that.layers[layer].field].push(data);
                }
            } else {
                that.selected[that.layers[layer].field] = data;
            }

            // Change tab title to current selected
            var thisTab = that.$tabs.tabs('getTab', layer), newTitle = '';
            if (thisTab.panel('options').title != data[that.layers[layer].labelField]) {
                newOption = true;
            }
            if (isMultipleAndLastLayer) {
                var newTitleArr = [];
                $.each(that.selected[that.layers[layer].field], function(i, v) {
                    newTitleArr.push(v[that.layers[layer].labelField]);
                });
                newTitle = newTitleArr.join(',');
                // Prevent a too long title, which collaspe the previous tab title
                if (newTitle.length * that.config.chracterPixels > that.config.panelWidth / 2) {
                    newTitle = newTitleArr[0] + ',..,' + newTitleArr[newTitleArr.length-1];
                }
            } else {
                newTitle = data[that.layers[layer].labelField];
            }
            that.$tabs.tabs('update', {
                tab: thisTab,
                options: {
                    title: !newTitle ? that.layers[layer].prompt : newTitle
                }
            });

            if (layer == that.layerCount-1) {
                var result = that.config.onSelectData(that.selected);
                that.$element.textbox('setValue', result);
                that.config.multiple ? null : that._hide();
            } else {
                // Select a different item 
                if (newOption) {
                    that.$element.textbox('clear');

                    // Clear data
                    that._resetSelectedData(layer+1);

                    // Close tabs after layer
                    that._resetTabs(layer+1);
                    
                    // Load next layer data
                    that.layerData[that.layers[layer+1].field] = that.layers[layer+1].dataProvider(data);
                    
                    // Add a tab
                    that._addTab(layer+1);
                } else {
                    that.$tabs.tabs('select', layer+1);
                }
            }
        },
        /** Load Data */
        load: function(param) {
            this._resetSelectedData();
            for (var i=0; i<this.layers.length; i++) {
                var data = null, flag = param.flag ? param.flag : this.layers[i].labelField;
                
                for (var j=0; j<this.layerData[this.layers[i].field].length; j++) {
                    if (this.layerData[this.layers[i].field][j][flag] === param[this.layers[i].field]) {
                        data = this.layerData[this.layers[i].field][j];
                    }
                }
                this._onSelectLayer(i, data);
            }
            return this;
        },
        /** Controller */
        callMethod: function(name, param) {
            switch (name) {
            case 'getText':
                return this.$element.textbox('getText');
            case 'load':
                return this.load(param);
            case 'clear':
                this._resetSelectedData();
                this._resetTabs();
                this.$element.textbox('clear');
                return this;
            }
        }
    }

    $.fn.layerselector = function(option, param) {
        if (typeof option === 'string') {
            var layerselector = $(this).data('layerselector');
            return layerselector.callMethod(option, param);
        } else {
            return this.each(function() {
                $(this).data('layerselector', (layerselector = new LayerSelector(option, $(this))) );
            });
        }
    }

    $.fn.layerselector.defaults = {
        panelWidth: 300,            // The width of the panel
        panelHeight: 200,           // The height of the panel
        column: 4,                  // The columns of items in panel
        layers: [],                 // Layers
        multiple: false,            // Indicates multiple choices in the last layer
        chracterPixels: 15,         // Pixels for a character
        okText: 'OK',               // The text display in Ok button
        onSelectData: function(data) {      // Call when select in last layer
            var $this = this, o = data[$this.layers[$this.layers.length-1].field];
            if ($this.multiple) {
                var arr = [];
                $.each(o, function(i, v) {
                    arr.push(v[ $this.layers[$this.layers.length-1].labelField ]);
                });
                return arr.join(',');
            } else {
                return o[ $this.layers[$this.layers.length-1].labelField ];
            }
        }
    };

    $.fn.layerselector.defaultLayer = {
        dataProvider: function(selected) {  // Provide this layer's data base on previous layer's selected

        },      
        idField: 'id',                      // Id field name
        labelField: 'label',                // Label field name
        prompt: 'Select',                   // Prompt message in the tab title initially
        otherItem: function(selected) {     // Define whether other item should be display base on previous layer's selected
            return false;
        },
        otherText: 'Other',                 // Other item display text
        otherOkText: 'Ok'                   // Other textbox button
    };

})(jQuery);



