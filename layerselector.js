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

		init.call(that);
	};

	function init() {
		var that = this;
		that.initMain();			// 缓存数据
		that.bindEvent();			// 绑定事件
		// 显示第一层数据
		that.layerData[0] = that.config.layers[0].dataProvider();
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
			
			$('body').append('<div id="layerSelector" style="width:' + (that.config.width+10) + 
						'px;height:' + (that.config.height+10) + 'px;position:relative;z-index:1000111;border: 1px solid gray;"><div id="tabs"></div></div>');

			that.$dialog = $("#layerSelector");
			that.$tabs = $("#tabs");
			that.$tabs.tabs({
				border: false,
				width: that.config.width+10,
				height: that.config.height+10,
				onUpdate: function(title, layer) {
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

			// 每个 item 需要占的width
			that.columnWidth = Math.floor(that.config.width/that.config.column) - 5;
			// 每一层的数据
			that.layerData = [];		
			// 每一层的选择
			that.selected = [];		
		},
		bindEvent: function() {
			var that = this;

			// item鼠标悬停效果
			that.$dialog.on('mouseover', '.link', function() {
				$(this).addClass('focus');
			});
			that.$dialog.on('mouseout', '.link', function() {
				$(this).removeClass('focus');
			});
			
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
				for (var i in that.layerData[layer]) {
					if ( that.layerData[layer][i][that.config.layers[layer].idField] == id ) {
						data = that.layerData[layer][i];
						break;
					}
				}
				
				// TODO 多选而且选择的item是最后一层
				if (that.config.multiple && layer==that.config.layers.length-1) {
					// 在原来selected中找，找到就移走，清除样式
					var origin = false;
					
					for (var i=layer; i<that.selected.length; i++) {
						if (that.selected[i][that.config.layers[layer].idField] == id) {
							origin = true;
							that.selected = [].concat(that.selected.slice(0, i), that.selected.slice(i+1));
							$this.removeClass('selected');
							break;
						}
					}

					// 找不到就加进，加入样式
					if (!origin) {
						that.selected.push(data);
						$this.addClass('selected');
					}
				} else {
					that.selected[layer] = data;
				}
				console.log(that.selected);
				
				that._onSelectLayer(layer, data);
			});
			
			// tab页面鼠标悬停显示该tab
			that.$dialog.on('mouseover', 'ul.tabs>li',  function() {
				that.$tabs.tabs('select', $(this).index());
			});
			
			// 单击textbox显示选择器
			that.$element.textbox('textbox').on('click', function() {
				that._show();
			});

			// 单击除了选择器面板外的地方隐藏面板
			$('html').on('mousedown', function(event) {
				// TODO 点击textbox和icon本身时出现闪烁，这里的mousedown事件没有处理
				// 到点击textbox和icon的事件
				if ($(event.target).closest('#layerSelector').length==0) {
					that._hide();
				}
			});
		},
		_show: function() {
			var that = this, pos = that.$element.textbox('textbox').offset();
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
				title: that.config.layers[layer].prompt,
				content: that._generateContent(layer),
				selected: true
			});
		},
		_generateContent: function(layer) {
			// 生成某一层的UI
			var that = this, obj = that.layerData[layer], lineArr = [], line = '', ret = '';
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
			ret = '<div style="width:'+(that.config.width)+'px;" class="line">' + 
					lineArr.join('</div><div style="width:'+(that.config.width)+'px;" class="line">') + '</div>';
			
			// 添加其他选项
			if (that.config.layers[layer].otherItem(layer==0 ? null : that.selected[layer-1])) {
				var str = '<div style="width:'+(that.config.width)+'px;" class="line"><div style="width:' + that.columnWidth + 
						'px;"><label data-id="other" class="link">其他</label></div>' +
						'<div style="width:'+(that.columnWidth*(that.config.column-1))+'px;"><input name="othertext'+layer+'" style="width:100%;"></div>' + 
						'</div>';
				ret += str;
			}
			return ret;
		},
		_onSelectLayer: function(layer, data) {
			var that = this;
			
			// 将当前tab的标题改为选中的item
			var thisTab = that.$tabs.tabs('getTab', layer);
			var newTitle = '';
			if (layer==that.config.layers.length-1 && that.config.multiple) {
				// TODO 最后一层多选
				var newTitleArr = [];
				for (var i=layer; i<that.selected.length; i++) {
					newTitleArr.push(that.selected[i][that.config.layers[layer].labelField]);
				}
				newTitle = newTitleArr.join(',');
			} else {
				newTitle = data[that.config.layers[layer].labelField];
			}
			that.$tabs.tabs('update', {
				tab: thisTab,
				options: {
					title: newTitle=='' ? that.config.layers[layer].prompt : newTitle
				}
			});

			// 已经选择了最后一层
			if (layer == that.config.layers.length-1) {
				var result = that.config.onSelectData(that.selected);
				that.$element.textbox('setValue', result);
				if (!that.config.multiple) {
					that._hide();
				}
				return;
			} else {
				// 关闭选中的layer之后的tabs
				var allTabs = that.$tabs.tabs('tabs');
				for (var i=allTabs.length-1; i>layer; i--) {
					that.$tabs.tabs('close', i);
				}
				
				// 加载下一层的数据
				that.layerData[layer+1] = that.config.layers[layer+1].dataProvider(data);
				
				// 增加一个tab
				that._addTab(layer+1);
			}
		},
		test: function() {
			//console.log($(this));
		}
	}

	$.fn.layerselector = function(option, param) {
		return this.each(function() {
			var $this = $(this);
			var layerselector = $this.data('layerselector');
			if (typeof option == 'string') {
				layerselector[option].apply($this, Array.prototype.slice.call(arguments, 1));
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
			var $this = this, o = data.pop();
			if ($this.multiple) {
				var arr = [];
				for (var i=$this.layers.length-1; i<$this.layers.length; i++) {
					arr.push(data[ $this.layers[$this.layers.length-1].labelField ]);
				}
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



