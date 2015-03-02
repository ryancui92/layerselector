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
		that.layerCount = that.layers.length;	// How many layers
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

			// Multiple OK button click event
			that.$dialog.on('click', '.ok-button', function() {
				that._hide();
			});

			that.$tabs = $("#tabs");
			that.$tabs.tabs({
				border: false,
				width: that.config.width+10,
				height: that.config.height+10,
				onUpdate: function(title, layer) {
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

					if (that.layers[layer].otherItem(layer==0 ? null : that.selected[that.layers[layer-1].field])) {
						that.$otherText = $("[name='othertext"+layer+"']");
						that.$otherText.textbox({
							buttonText: 'OK',
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

			// Hide panel when click outside the panel
			$('html').on('mousedown', function(event) {
				// TODO When click the textbox or textbox-icon, the panel will flash,
				// 		we should handle the event later
				if ($(event.target).closest('#layerSelector').length==0) {
					that._hide();
				}
			});

			// The minimal width of one item
			that.columnWidth = Math.floor(that.config.width/that.config.column) - 5;
			that.layerData = {};		// Data in each layer
			that.selected = {};			// Selected Data in each layer
		},
		bindEvent: function() {
			var that = this;

			that.$dialog.on('click', '.link', function() {
				var $this = $(this),
					id = $(this).data('id'),
					tab = that.$tabs.tabs('getSelected'),			
					layer = that.$tabs.tabs('getTabIndex', tab),
					data = null;
				
				if (!id || id=='other') {
					return;
				}
				
				// Find data according to id
				for (var i in that.layerData[that.layers[layer].field]) {
					if ( that.layerData[that.layers[layer].field][i][that.layers[layer].idField] == id ) {
						data = that.layerData[that.layers[layer].field][i];
						break;
					}
				}
				
				if (that.config.multiple && layer==that.layerCount-1) {
					var lastSelected = that.selected[that.layers[layer].field], origin = false; 
					if (!lastSelected) {
						that.selected[that.layers[layer].field] = [];
						lastSelected = [];
					}

					// If already select before, then remove it
					for (var i=0; i<lastSelected.length; i++) {
						if (lastSelected[i][that.config.layers[layer].idField] == id) {
							origin = true;
							that.selected[that.layers[layer].field] = [].concat(lastSelected.slice(0, i), lastSelected.slice(i+1));
							break;
						}
					}
					// If not select, add it in selected data
					if (!origin) {
						that.selected[that.layers[layer].field].push(data);
					}

					that._onSelectLayer(layer, data);

					// Change CSS
					if (origin) {
						$this.removeClass('kkkk');
					} else {
						$this.addClass('kkkk');
					}
				} else {
					that.selected[that.layers[layer].field] = data;
					that._onSelectLayer(layer, data);
				}
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
		 *	Add a tab in layer
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
		 * @param {number} layer The layer number begin with 0
		 * @return {string} HTML code
		 */
		_generateContent: function(layer) {
			var that = this, obj = that.layerData[that.layers[layer].field], lineArr = [], line = '', ret = '';
			for (var i=0, j=0; i<obj.length; i++) {
				var colspan = 1;
				while (obj[i][that.layers[layer].labelField].length * that.config.chracterPixels 
					> that.columnWidth * colspan) {
					colspan++;
					j++;
				}
				// The rest of the line cannot afford enough space for colspan
				// Then go to next line
				if (colspan+j >= that.config.column) {
					lineArr.push(line);
					line = '';
					j = colspan-1;
				}
				line += '<div style="width:' + that.columnWidth*colspan + 'px;"><label data-id="' + 
					obj[i][that.layers[layer].idField] + '" class="link">' + 
					obj[i][that.layers[layer].labelField] + '</label></div>';
				if (j%that.config.column == that.config.column-1) {
					lineArr.push(line);
					line = '';
				}
			}
			if (line != '') {
				lineArr.push(line);
			} 
			ret = '<div style="width:'+(that.config.width)+'px;" class="line">' + 
				lineArr.join('</div><div style="width:'+(that.config.width)+'px;" class="line">') + '</div>';
			
			// Other item exists?
			// TODO Change Chinese into Variable defined
			if (that.layers[layer].otherItem(layer==0 ? null : that.selected[that.layers[layer-1].field])) {
				var str = '<div style="width:'+(that.config.width)+'px;" class="line"><div style="width:' + 
					that.columnWidth +'px;"><label data-id="other" class="link">其他</label></div>' +
					'<div style="width:'+ (that.columnWidth*(that.config.column-1)) +
					'px;"><input name="othertext'+ layer +'" style="width:100%;"></div>' + 
					'</div>';
				ret += str;
			}

			// Add a OK button when in multiple mode
			if (that.config.multiple && layer==that.layerCount-1) {
				var str = '<div style="width:'+(that.config.width)+'px;text-align:center;">' +
					'<a href="#" class="easyui-linkbutton ok-button" style="width:'+ that.columnWidth + 'px;">确定</a></div>' + 
					'</div>';
				ret += str;
			}
			return ret;
		},
		_onSelectLayer: function(layer, data) {
			var that = this, newOption = false;
			
			// Clear selected data after layer+1
			for (var i=layer+1; i<that.layerCount; i++) {
				that.selected[that.layers[i].field] = null;
			}

			// Change tab title to current selected
			var thisTab = that.$tabs.tabs('getTab', layer), newTitle = '';
			if (thisTab.panel('options').title != data[that.layers[layer].labelField]) {
				newOption = true;
			}
			if (that.config.multiple && layer==that.layerCount-1) {
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

			if (layer == that.layerCount-1) {
				var result = that.config.onSelectData(that.selected);
				that.$element.textbox('setValue', result);
				if (!that.config.multiple) {
					that._hide();
				}
				return;
			} else {
				// Select a different item 
				if (newOption) {
					that.$element.textbox('clear');

					// Close tabs after layer+1
					var allTabs = that.$tabs.tabs('tabs');
					for (var i=allTabs.length-1; i>layer; i--) {
						that.$tabs.tabs('close', i);
					}
					
					// Load next layer data
					that.layerData[that.layers[layer+1].field] = that.layers[layer+1].dataProvider(data);
					
					// Add a tab
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

	$.fn.layerselector.defaults = {
		width: 300,					// The width of the panel
		height: 200,				// The height of the panel
		column: 4,					// The columns of items in panel
		layers: [],					// Layers
		multiple: false,			// Indicates multiple choices in the last layer
		chracterPixels: 15,			// Pixels for a character
		onSelectData: function(data) {		// Call when select in last layer
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
		dataProvider: function(selected) {	// Provide this layer's data base on previous layer's selected

		},		
		idField: 'id',						// Id field name
		labelField: 'label',				// Label field name
		prompt: 'Select',					// Prompt message in the tab title initially
		otherItem: function(selected) {		// Define whether other item should be display base on previous layer's selected
			return false;
		}
	};

})(jQuery);



