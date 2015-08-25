/** 
 * Layer selector version 1.1
 * @author ryancui
 */

(function($) {

    var LayerSelector = function(options, element) {
        var that = this;
        that.$element = element;
        that.options = $.extend({}, $.fn.layerselector.defaults, options);
        $.each(that.options.layers, function(i, v) {
            that.options.layers[i] = $.extend({}, $.fn.layerselector.defaultLayer, v);
        });
        that.layers = that.options.layers;

        // 层数
        that.layerCount = that.layers.length;

        // 每一列的宽度
        that.columnWidth = Math.floor(that.options.panelWidth/that.options.column) - 5;

        // 每一层的数据，kv字典，key为layer的field
        that.layerData = {};

        // 每一层选择的数据，kv字典，key为layer的field
        that.selected = {};

        init.call(that);
    };

    function init() {
        var that = this;
        that._initMain();
        that.layerData[that.layers[0].field] = that.layers[0].dataProvider();
        that._addTab(0);
        that._hide();
    }

    LayerSelector.prototype = {
        constrcutor: LayerSelector,
        _initMain: function() {
            var that = this;

            // 初始化easyui textbox控件
            that.$element.textbox({
                // TODO More textbox attribute
                required: that.options.required || false,
                editable: false,
                icons: [{
                    iconCls:'icon-search',
                    handler: function() {
                        that._show();
                    }
                }]
            });
            that.$element.textbox('textbox').on('click', $.proxy(that._show, that));

            // 创建选择器dom并添加到body中
            that.$dialog = $('<div class="panel-body" style="width:' + (that.options.panelWidth+10) +
                'px;height:' + (that.options.panelHeight+10) + 'px;position:relative;z-index:1000111;">' +
                '<div class="layer-tabs"></div></div>');
            that.$dialog.appendTo('body');

            // 鼠标移动到tab标签时显示该tab的内容
            that.$dialog.on('mouseover', 'ul.tabs>li',  function() {
                that.$tabs.tabs('select', $(this).index());
            });

            // 鼠标移进移出item显示底纹
            that.$dialog.on('mouseover', '.link', function() {
                $(this).addClass('calendar-nav-hover');
            });
            that.$dialog.on('mouseout', '.link', function() {
                $(this).removeClass('calendar-nav-hover');
            });

            // 绑定item的click事件
            that.$dialog.on('click', '.link', function() {
                var $this = $(this),
                    id = $(this).data('id'),
                    tab = that.$tabs.tabs('getSelected'),
                    layer = that.$tabs.tabs('getTabIndex', tab),
                    data = null;

                // click其他item
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

                // 根据id查找click的item数据
                $.each(that.layerData[that.layers[layer].field], function(i, v) {
                    if ( v[that.layers[layer].idField] === id ) {
                        data = v;
                        return true;
                    }
                });

                that._onSelectLayer(layer, data);

            });

            // 多选时，确定按钮隐藏选择器
            that.$dialog.on('click', '.ok-button', function() {
                that._hide();
            });

            // 创建easyui标签页
            that.$tabs = that.$dialog.find('div.layer-tabs');
            that.$tabs.tabs({
                border: false,
                width: that.options.panelWidth + 10,
                height: that.options.panelHeight + 10,
                onUpdate: function(title, layer) {
                    // 如果是多选模式而且更新最后一层，则重新渲染选中的item css
                    if (that.options.multiple && layer==that.layerCount-1) {
                        var thisTab = that.$tabs.tabs('getTab', layer);
                        var $allLink = thisTab.panel('panel').find('.link');

                        // 取消所有item的选中css样式，再判断是否已经选中，选中则添回选中css样式
                        $allLink.each(function() {
                            $(this).removeClass('calendar-selected');
                            var id = $(this).data('id'), has = false;
                            if (that.selected[that.layers[layer].field]) {
                                $.each(that.selected[that.layers[layer].field], function(i, v) {
                                    if (v[that.layers[layer].idField] === id) {
                                        has = true;
                                        return true;
                                    }
                                });
                                if (has) {
                                    $(this).addClass('calendar-selected');
                                } else {
                                    $(this).removeClass('calendar-selected');
                                }
                            }
                        });
                    }

                    // 如果这一层有其他选项，则easyui渲染其他输入框
                    if (that.layers[layer].otherItem(!layer ? null : that.selected[that.layers[layer-1].field])) {
                        // TODO 不使用选择器，直接从jquery object中读取
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

            // 当点击窗口以外的区域时，隐藏窗口
            $('html').on('mousedown', function(event) {
                // TODO 当点击textbox时，会发生闪烁，由于触发mousedown事件先，再触发textbox的click事件
                if ($(event.target).closest(that.$dialog).length === 0) {
                    that._hide();
                }
            });

            that._resetSelectedData();
        },
        /** 显示选择器 */
        _show: function() {
            var that = this, pos = that.$element.textbox('textbox').offset();
            // TODO 兼容浏览器和相关的css样式
            that.$dialog.css({
                'top': pos.top - 7 + that.$element.textbox('options').height,
                'left': pos.left - 9
            });
            that.$dialog.css({'display': 'block'});
        },
        /** 隐藏选择器 */
        _hide: function() {
            var that = this;
            that.$dialog.css({'display': 'none'});
        },
        /** 在第 layer 层增加 tab 页面 */
        _addTab: function(layer) {
            var that = this;
            that.$tabs.tabs('add', {
                title: that.layers[layer].prompt,
                content: that._generateContent(layer),
                selected: true
            });
        },
        /** 生成第 layer 层的 HTML 代码 */
        _generateContent: function(layer) {
            var that = this, 
                data = that.layerData[that.layers[layer].field],
                lineArr = [], line = '', ret = '', linePos = 1, colspan = 1;

            for (var i=0; i<data.length; i++) {
                colspan = 1;

                // 如果当前item的label显示长度比一列的长度要宽则扩展一列，
                // 直到能容纳label的长度或到了能显示的列数
                while (data[i][that.layers[layer].labelField].length * that.options.chracterPixels
                    > that.columnWidth * colspan) {
                    colspan++;
                    linePos++;
                    if (colspan == that.options.column) {
                        break;
                    }
                }
                
                // 从该位置到这行的最后都不能容纳该label，则不要这一行，再下一行开始继续
                if (linePos > that.options.column) {
                    lineArr.push(line);
                    line = '';
                    linePos = colspan;
                }

                line += '<div style="width:' + that.columnWidth*colspan + 'px;"><label data-id="' + 
                    data[i][that.layers[layer].idField] + '" class="link">' +
                    data[i][that.layers[layer].labelField] + '</label></div>';

                // 已经到了一行的结尾则另起一行，否则将自增列坐标
                if (linePos%that.options.column == 0) {
                    lineArr.push(line);
                    line = '';
                    linePos = 1;
                } else {
                    linePos++;
                }
            }

            // 处理剩余的行
            if (line) {
                lineArr.push(line);
            }

            var items = '<div style="width:'+(that.options.panelWidth)+'px;" class="line"><span style="margin-left:10px;"></span>' +
                lineArr.join('</div><div style="width:'+(that.options.panelWidth)+'px;" class="line"><span style="margin-left:10px;"></span>') + '</div>';
            
            // 如果有其他选项，则增加一个textbox控件
            if (that.layers[layer].otherItem(layer==0 ? null : that.selected[that.layers[layer-1].field])) {
                // TODO 这里用 JQuery 对象来生成 DOM，而不是用 CSS 选择器来选择
                var str = '<div style="width:'+(that.options.panelWidth)+'px;" class="line"><span style="margin-left:10px;"></span><div style="width:' +
                    that.columnWidth +'px;"><label class="link">'+ that.layers[layer].otherText +'</label></div>' +
                    '<div style="width:'+ (that.columnWidth*(that.options.column-1)) +
                    'px;"><input name="othertext'+ layer +'" style="width:100%;"></div>' + 
                    '</div>';
                items += str;
            }

            // 如果是多选模式，则增加一个确定按钮
            if (that.options.multiple && layer==that.layerCount-1) {
                var okButton = '<div style="width:'+(that.options.panelWidth)+'px;text-align:center;vertical-align:middle;">' +
                    '<a href="javascript:void(0)" class="easyui-linkbutton ok-button" data-options="iconCls:\'icon-ok\'" ' +
                    'style="width:60px;">'+ that.options.okText +'</a></div></div>';
                ret = '<div class="easyui-layout" data-options="fit:true"><div data-options="region:\'center\',border:false">'+items+'</div>' +
                    '<div data-options="region:\'south\',border:false" style="height:30px;">'+okButton+'</div></div>';
            } else {
                ret = '<div class="easyui-layout" data-options="fit:true"><div data-options="region:\'center\',border:false">'+items+'</div></div>';
            }
            return ret;
        },
        /** 从 sLayer 开始重置已经选择的数据为 null 或空数组 */
        _resetSelectedData: function(sLayer) {
            sLayer = sLayer ? sLayer : 0;
            for (var i=sLayer; i<this.layers.length; i++) {
                if (this.options.multiple && i == this.layerCount - 1) {
                    this.selected[this.layers[i].field] = [];
                } else {
                    this.selected[this.layers[i].field] = null;
                }
            }
        },
        /** 关闭 sLayer 之后的所有 tab 页面 */
        _resetTabs: function(sLayer) {
            sLayer = sLayer ? sLayer : 1;
            var allTabs = this.$tabs.tabs('tabs');
            for (var i = allTabs.length-1; i >= sLayer; i--) {
                this.$tabs.tabs('close', i);
            }
        },
        /** 当选择了 layer 层的 data 后回调 */
        _onSelectLayer: function(layer, data) {
            var that = this;
            var newOption = false;      // 这次选择的item是否是新选择的
            var isMultipleAndLastLayer = that.options.multiple && layer==that.layerCount-1;

            // 把当前选择的 data 放进 selected 中
            if (isMultipleAndLastLayer) {
                var lastSelected = that.selected[that.layers[layer].field], origin = false; 

                // 如果之前已经选中了，将他移出 selected 数组
                for (var i=0; i<lastSelected.length; i++) {
                    if (lastSelected[i][that.layers[layer].idField] === data[that.layers[layer].idField]) {
                        origin = true;
                        that.selected[that.layers[layer].field] = 
                            [].concat(lastSelected.slice(0, i), lastSelected.slice(i+1));
                        break;
                    }
                }
                // 之前没有选中则添加进 selected 数组
                if (!origin) {
                    that.selected[that.layers[layer].field].push(data);
                }
            } else {
                that.selected[that.layers[layer].field] = data;
            }

            // 将当前 layer 的 tab 页面标题改为选择的 item
            var thisTab = that.$tabs.tabs('getTab', layer), newTitle = '';
            if (thisTab.panel('options').title != data[that.layers[layer].labelField]) {
                newOption = true;
            }

            // 多选则根据 selected 数组构造显示 title
            if (isMultipleAndLastLayer) {
                var newTitleArr = [];
                $.each(that.selected[that.layers[layer].field], function(i, v) {
                    newTitleArr.push(v[that.layers[layer].labelField]);
                });
                newTitle = newTitleArr.join(',');
                // 避免太长的 title
                if (newTitle.length * that.options.chracterPixels > that.options.panelWidth / 2) {
                    newTitle = newTitleArr[0] + ',..,' + newTitleArr[newTitleArr.length-1];
                }
            } else {
                newTitle = data[that.layers[layer].labelField];
            }

            // 更新当前 tab 页面
            that.$tabs.tabs('update', {
                tab: thisTab,
                options: {
                    title: !newTitle ? that.layers[layer].prompt : newTitle
                }
            });

            if (layer == that.layerCount-1) {
                var result = that.options.onSelectData(that.selected);
                that.$element.textbox('setValue', result);
                that.options.multiple ? null : that._hide();
            } else {
                // 选择了一个新 item 则 reset 后面的全部数据和 tab 页面
                if (newOption) {
                    that.$element.textbox('clear');
                    that._resetSelectedData(layer+1);
                    that._resetTabs(layer+1);
                    that.layerData[that.layers[layer+1].field] = that.layers[layer+1].dataProvider(data);
                    that._addTab(layer+1);
                } else {
                    that.$tabs.tabs('select', layer+1);
                }
            }
        },
        /** 加载数据 */
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
        /** 外部方法调用路由 */
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

    /** JQuery Plugin */
    $.fn.layerselector = function(option, param) {
        if (typeof option === 'string') {
            var layerselector = $(this).data('layerselector');
            return layerselector.callMethod(option, param);
        } else {
            return this.each(function() {
                $(this).data('layerselector', (layerselector = new LayerSelector(option, $(this))) );
            });
        }
    };

    $.fn.layerselector.defaults = {
        panelWidth: 300,            // 选择器的宽度
        panelHeight: 200,           // 选择器的高度
        column: 4,                  // 选择器列数
        layers: [],                 // 选择层
        multiple: false,            // 最后一层是否多选
        chracterPixels: 15,         // 每一个中文字的像素宽度
        okText: '确  定',           // 确定按钮显示的文字
        onSelectData: function(data) {      // 最后一层选择的回调函数
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
        dataProvider: function(selected){}, // 提供数据源
        idField: 'id',                      // ID 域名称
        labelField: 'label',                // Label 域名称
        prompt: 'Select',                   // tab 标签的提示信息
        otherItem: function() {             // 是否显示其他选项，可根据上一层的选择结果进行判断
            return false;
        },
        otherText: '其他',                    // 其他选项的显示文字
        otherOkText: '确定'                   // 其他选项按钮显示文字
    };

})(jQuery);
