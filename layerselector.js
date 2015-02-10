/** 
 * 层级选择器-插件
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
		init.call(that);
	};

	function init() {
		var that = this;
		that.initMain();			// 缓存数据
		that.bindEvent();			// 绑定事件
		// 显示第一层数据
		that.layerData[that.layers[0].field] = that.layers[0].dataProvider();
		that._addTab(0);
		// 隐藏dialog
		that._hide();
	}

	LayerSelector.prototype = {
		constrcutor: LayerSelector,
		initMain: function() {
			var that = this;
			that.$element.textbox({
				editable: false,
				icons: [{
	                iconCls:'icon-search',
	                handler: function(e){
	                	that._show();
	                }
	            }]
			});
			that.$element.textbox('textbox').on('click', function() {
				that._show();
			});

			$('body').append('<div id="layerSelector" class="panel-body" style="width:' + (that.config.width+10) + 
						'px;height:' + (that.config.height+10) + 'px;position:relative;z-index:1000111;"><div id="tabs"></div></div>');

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

			that.$tabs = $("#tabs");
			that.$tabs.tabs({
				border: false,
				width: that.config.width+10,
				height: that.config.height+10,
				onUpdate: function(title, layer) {
					if (that.layers[layer].otherItem(layer==0 ? null : that.selected[that.layers[layer-1].field])) {
						that.$otherText = $("[name='othertext"+layer+"']");
						that.$otherText.textbox({
							buttonText: '确定',
							onClickButton: function() {
								var val = that.$otherText.textbox('getText'), data = {};
								data[that.layers[layer].labelField] = val;
								if (layer==that.layers.length-1 && that.config.multiple) {
									if (!that.selected[that.layers[layer].field]) {
										that.selected[that.layers[layer].field] = [];
									}
									that.selected[that.layers[layer].field].push(data);
								} else {
									that.selected[that.layers[layer].field] = data;
								}
								that._onSelectLayer(layer, data);
							}
						});
					}
				}
			});

			// 单击除了选择器面板外的地方隐藏面板
			$('html').on('mousedown', function(event) {
				// TODO 点击textbox和icon本身时出现闪烁，这里的mousedown事件没有处理
				// 到点击textbox和icon的事件
				if ($(event.target).closest('#layerSelector').length==0) {
					that._hide();
				}
			});

			that.columnWidth = Math.floor(that.config.width/that.config.column) - 5;	// 每个 item 需要占的width
			that.layerData = {};		// 每一层的数据
			that.selected = {};			// 每一层的选择
		},
		bindEvent: function() {
			var that = this;

			// item选择事件
			that.$dialog.on('click', '.link', function() {
				var $this = $(this),
					id = $(this).data('id'),						// 选中item的id
					tab = that.$tabs.tabs('getSelected'),			
					layer = that.$tabs.tabs('getTabIndex', tab),	// 当前所在层
					data = null;
				
				if (!id || id=='other') {
					return;
				}
				
				// 找到对应的data
				for (var i in that.layerData[that.layers[layer].field]) {
					if ( that.layerData[that.layers[layer].field][i][that.layers[layer].idField] == id ) {
						data = that.layerData[that.layers[layer].field][i];
						break;
					}
				}
				
				// 多选而且选择的item是最后一层
				if (that.config.multiple && layer==that.layers.length-1) {
					var lastSelected = that.selected[that.layers[layer].field], origin = false; 
					
					if (!lastSelected) {
						that.selected[that.layers[layer].field] = [];
						lastSelected = [];
					}

					// 之前找到就移除掉
					for (var i=0; i<lastSelected.length; i++) {
						if (lastSelected[i][that.config.layers[layer].idField] == id) {
							origin = true;
							that.selected[that.layers[layer].field] = [].concat(lastSelected.slice(0, i), lastSelected.slice(i+1));
							break;
						}
					}

					// 找不到就加进选中
					if (!origin) {
						that.selected[that.layers[layer].field].push(data);
					}

					that._onSelectLayer(layer, data);

				} else {
					that.selected[that.layers[layer].field] = data;
					that._onSelectLayer(layer, data);
				}
				// console.log(that.selected);
			});

			// that.$dialog.on('mouseup', '.link', function() {
			// 	var $this = $(this),
			// 		id = $(this).data('id'),						// 选中item的id
			// 		tab = that.$tabs.tabs('getSelected'),			
			// 		layer = that.$tabs.tabs('getTabIndex', tab),	// 当前所在层
			// 		origin = false;
			// 	if (that.config.multiple && layer==that.layers.length-1) {
			// 		if (that.selected[that.layers[layer].field]) {
			// 			$.each(that.selected[that.layers[layer].field], function(i, v) {
			// 				if (v[that.layers[layer].idField] == id) {
			// 					origin = true;
			// 				}
			// 			});
			// 		}
			// 		origin ? $this.removeClass('calendar-selected') : $this.addClass('calendar-selected');
			// 	}
			// });
		},
		_show: function() {
			var that = this, pos = that.$element.textbox('textbox').offset();
			// The exact constants here need to be adjusted due to different circumstances.
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
		_addTab: function(layer) {
			// 添加第layer层的tab页面并跳到该页面
			var that = this;
			that.$tabs.tabs('add', {
				title: that.layers[layer].prompt,
				content: that._generateContent(layer),
				selected: true
			});
		},
		_generateContent: function(layer) {
			// 生成某一层的UI
			var that = this, obj = that.layerData[that.layers[layer].field], lineArr = [], line = '', ret = '';
			for (var i=0; i<obj.length; i++) {
				line += '<div style="width:' + that.columnWidth + 'px;"><label data-id="' + 
					obj[i][that.layers[layer].idField] + '" class="link">' + 
					obj[i][that.layers[layer].labelField] + '</label></div>';
				if (i%that.config.column == that.config.column-1) {
					lineArr.push(line);
					line = '';
				}
			}
			if (line != '') {
				lineArr.push(line);
			} 
			ret = '<div style="width:'+(that.config.width)+'px;" class="line">' + 
				lineArr.join('</div><div style="width:'+(that.config.width)+'px;" class="line">') + '</div>';
			
			// 添加其他选项
			if (that.layers[layer].otherItem(layer==0 ? null : that.selected[that.layers[layer-1].field])) {
				var str = '<div style="width:'+(that.config.width)+'px;" class="line"><div style="width:' + 
					that.columnWidth +'px;"><label data-id="other" class="link">其他</label></div>' +
					'<div style="width:'+ (that.columnWidth*(that.config.column-1)) +
					'px;"><input name="othertext'+ layer +'" style="width:100%;"></div>' + 
					'</div>';
				ret += str;
			}
			return ret;
		},
		_onSelectLayer: function(layer, data) {
			var that = this, newOption = false;
			
			// 清空layer+!层之后的选中数据
			if (layer != that.layers.length-1) {
				for (var i=layer+1; i<that.layers.length; i++) {
					that.selected[that.layers[i].field] = null;
				}
			}

			// 将当前tab的标题改为选中的item
			var thisTab = that.$tabs.tabs('getTab', layer);
			if (thisTab.panel('options').title != data[that.layers[layer].labelField]) {
				newOption = true;
			}
			
			// 更新当前层的标题
			var newTitle = '';
			if (layer==that.layers.length-1 && that.config.multiple) {
				var newTitleArr = [];
				$.each(that.selected[that.layers[layer].field], function(i, v) {
					newTitleArr.push(v[that.layers[layer].labelField]);
				});
				newTitle = newTitleArr.join(',');
			} else {
				newTitle = data[that.layers[layer].labelField];
			}
			that.$tabs.tabs('update', {
				tab: thisTab,
				options: {
					title: newTitle=='' ? that.layers[layer].prompt : newTitle
				}
			});

			// 已经选择了最后一层
			if (layer == that.layers.length-1) {
				var result = that.config.onSelectData(that.selected);
				that.$element.textbox('setValue', result);
				if (!that.config.multiple) {
					that._hide();
				}
				return;
			} else {
				if (newOption) {
					that.$element.textbox('clear');

					// 关闭选中的layer之后的tabs
					var allTabs = that.$tabs.tabs('tabs');
					for (var i=allTabs.length-1; i>layer; i--) {
						that.$tabs.tabs('close', i);
					}
					
					// 加载下一层的数据
					that.layerData[that.layers[layer+1].field] = that.layers[layer+1].dataProvider(data);
					
					// 增加一个tab
					that._addTab(layer+1);
				} else {
					that.$tabs.tabs('select', layer+1);
				}
			}
		}
	}

	$.fn.layerselector = function(option, param) {
		return this.each(function() {
			var $this = $(this);
			var layerselector = $this.data('layerselector');
			if (typeof option == 'string') {
				layerselector.$element.textbox(option, param);
			} else if (typeof option == 'object') {
				$this.data('layerselector', (layerselector = new LayerSelector(option, $this)) );
			}
		});
	}

	// 层级选择器默认参数
	$.fn.layerselector.defaults = {
		width: 300,
		height: 200,
		column: 4,
		title: 'Search Layer',
		layers: [],
		multiple: false,
		onSelectData: function(data) {
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

	// 层级选择器某一层的默认参数
	$.fn.layerselector.defaultLayer = {
		dataProvider: function(selected) {},
		idField: 'id',
		labelField: 'label',
		prompt: 'Select',
		otherItem: function(selected) {return false;}
	};

})(jQuery);



