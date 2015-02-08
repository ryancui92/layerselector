/** 
 * 层级选择器-插件 1.0
 */

(function($) {

	var LayerSelector = function(config, element) {
		this.init(config, element);
	};

	LayerSelector.prototype = {
		constrcutor: LayerSelector,
		defaults: {
			width: 320,
			height: 200,
			title: 'Search Sites',
			column: 4,
			layers: [],
			onSelectData: function(data) {}
		},
		defaultLayer: {
			dataProvider: function(selected) {},
			idField: 'id',
			labelField: 'label',
			prompt: 'Select',
			otherItem: function(selected) {return false;},
			multiple: false
		},
		init: function(config, element) {
			var that = this;
			that.cacheData(config, element);		// 缓存数据
			that.initMain();			// 初始化
		},
		cacheData: function(config, element) {
			var that = this;
			that.$element = element;
			// 初始化
			that.$element.textbox({
				editable: false,
				icons: [{
	                iconCls:'icon-search',
	                handler: function(e){
	                	that._show();
	                }
	            }]
			});

			that.config = $.extend({}, that.defaults, config);
			for (var i=0; i<that.config.layers.length; i++) {
				that.config.layers[i] = $.extend({}, that.defaultLayer, that.config.layers[i]);
			}
			console.log(that.config);
			
			$('body').append('<div id="layerSelector"><div id="tabs"></div></div>');
			that.$dialog = $("#layerSelector");
			that.$tabs = $("#tabs");
			that.columnWidth = Math.floor(that.config.width/that.config.column) - 5;
			that.display = false;
			that.ignoreBlur = false;

			that.layerData = [];		// 每一层的数据
			that.selected = [];			// 每一层的选择
		},
		initMain: function() {
			var that = this;

			that.$tabs.tabs({
				width: that.config.width+10,
				height: that.config.height+10,
				onAdd: function(title, layer) {
					if (that.config.layers[layer].otherItem(layer==0 ? null : that.selected[layer-1])) {
						that.$otherText = $("[name='othertext"+layer+"']");
						that.$otherText.textbox({
							buttonText: '确定',
							onClickButton: function() {
								var val = that.$otherText.textbox('getText');
								var data = {};
								data[that.config.layers[layer].labelField] = val;
								that.selected[layer] = data;
								that._onSelectLayer(layer, data);
							}
						});
					}
				}
			});
			
			// item鼠标悬停效果
			that.$dialog.delegate('.link', 'mouseover', function() {
				$(this).addClass('focus');
			});
			that.$dialog.delegate('.link', 'mouseout', function() {
				$(this).removeClass('focus');
			});
			
			// item选择事件
			that.$dialog.delegate('.link', 'click', function() {
				that.$element.focus();

				var id = $(this).data('id'),						// 选中item的id
					tab = that.$tabs.tabs('getSelected'),			
					layer = that.$tabs.tabs('getTabIndex', tab),	// 当前所在层
					data = null;
				
				if (!id || id=='other') {
					return;
				}
				
				// 找到对应的data
				for (var i in that.layerData[layer]) {
					if ( that.layerData[layer][i][that.config.layers[layer].idField] == id ) {
						data = that.layerData[layer][i];
						that.selected[layer] = data;				// 设置当前已经选择的数据项 
						break;
					}
				}
				
				that._onSelectLayer(layer, data);
			});
			
			// tab页面鼠标悬停显示该tab
			that.$dialog.delegate('ul.tabs>li', 'mouseover', function() {
				that.$tabs.tabs('select', $(this).index());
			});
			
			that.$element.textbox('textbox').bind('click', function() {
				that._show();
			});

			$('html').bind('mousedown', function(event) {
				if ($(event.target).closest('#layerSelector').length == 0) {
					that._hide();
				}
			});

			// 显示第一层数据
			that.layerData[0] = that.config.layers[0].dataProvider();
			that._addTab(0);

			// 隐藏dialog
			that._hide();
		},
		_show: function() {
			var that = this;
			// that.$dialog.dialog('open');
			var pos = that.$element.textbox('textbox').offset();
			that.$dialog.css({
				'width': that.config.width+10,
				'height': that.config.height+10,
				'position': 'relative',
				'top': pos.top - 7 + that.$element.textbox('options').height,
				'left': pos.left - 9,
				'z-index': 10011111
			});
			that.display = true;
			that.$dialog.show();
		},
		_hide: function() {
			var that = this;
			that.display = false;
			that.$dialog.hide();
		},
		_addTab: function(layer) {
			// 添加一个tab页面并跳到该页面
			var that = this, contentObj = that._generateContent(layer);
			that.$tabs.tabs('add', {
				title: that.config.layers[layer].prompt,
				selected: true,
				content: contentObj.content
			});
			
		},
		_generateContent: function(layer) {
			// 生成某一层的UI
			var that = this, obj = that.layerData[layer], lineArr = [], line = '', ret = {};
			for (var i=0; i<obj.length; i++) {
				line += '<div style="width:' + that.columnWidth + 'px;"><label data-id="' + 
						obj[i][that.config.layers[layer].idField] + '" class="link">' + 
						obj[i][that.config.layers[layer].labelField] + '</label></div>';
				if (i%that.config.column == that.config.column-1) {
					lineArr.push(line);
					line = '';
				}
			}
			if (line != '') {
				lineArr.push(line);
			} 
			ret.content = '<div style="width:'+(that.config.width)+'px;" class="line">' + 
					lineArr.join('</div><div style="width:'+(that.config.width)+'px;" class="line">') + '</div>';
			
			// 添加其他选项
			if (that.config.layers[layer].otherItem(layer==0 ? null : that.selected[layer-1])) {
				var str = '<div style="width:'+(that.config.width)+'px;" class="line"><div style="width:' + that.columnWidth + 
						'px;"><label data-id="other" class="link">其他</label></div>' +
						'<div style="width:'+(that.columnWidth*(that.config.column-1))+'px;"><input name="othertext'+layer+'" style="width:100%;"></div>' + 
						'</div>';
				ret.content += str;
			}
			ret.rows = lineArr.length;
			return ret;
		},
		_onSelectLayer: function(layer, data) {
			var that = this;
			
			// 已经选择了最后一层
			if (layer == that.config.layers.length-1) {
				if (that.config.onSelectData(that.selected)) {
					that._hide();
				}
				return;
			}
			
			// 将当前tab的标题改为选中的item
			var thisTab = that.$tabs.tabs('getTab', layer);
			that.$tabs.tabs('update', {
				tab: thisTab,
				options: {
					title: data[that.config.layers[layer].labelField]
				}
			});
			
			// 关闭选中的layer之后的tabs
			var allTabs = that.$tabs.tabs('tabs');
			for (var i=allTabs.length-1; i>layer; i--) {
				that.$tabs.tabs('close', i);
			}
			
			// 加载下一层的数据
			that.layerData[layer+1] = that.config.layers[layer+1].dataProvider(data);
			
			// 增加一个tab
			that._addTab(layer+1);
		},
		toggleDisplay: function() {
			var that = this;
			if (that.display) {
				that._hide();
			} else {
				that._show();
			}
		}
	}

	$.fn.layerselector = function(option, param) {
		if (typeof option == 'string') {
			// TODO 方法调用
		} else if (typeof option == 'object') {
			return this.each(function() {
				var $this = $(this);
				var layerSelector = new LayerSelector(option, $this);
			});
		}
	}

})(jQuery);



