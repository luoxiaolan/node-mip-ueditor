#! /usr/bin/env node
const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {document} = (new JSDOM()).window;

const htmlfile = path.resolve(process.argv[2]);

fs.stat(htmlfile, function (err, stat) {
    if (err == null) {
        if (stat.isFile()) {
            fs.readFile(htmlfile, 'utf-8', function (err, data) {
                if (err) {
                    console.log(err);
                    return;
                } else {
                    let miphtml = init(data);
                    fs.writeFile(htmlfile + '.mip', JSON.stringify(miphtml), function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('写入成功');
                        }
                    });
                }
            });
        } else {
            console.log('请输入文件地址');
            return;
        }
    } else if (err.code == 'ENOENT') {
        console.log('路径不存在');
        return;
    } else {
        console.log('错误：' + err);
        return;
    }
});
/**
* MipUeditor类
*
* @class
*/
function MipUeditor() {
    this.htmlStr = ''; // 原始html字符串
    this.htmlElement; // element对象
    this.computeStyle = ''; // 保存计算属性
    this.computeStyleArray = []; // 提取classname集合
}

MipUeditor.prototype = {
    constructor: MipUeditor,

    /**
     * 初始化htmlStr
     *
     * @param {string} htmlStr 原始字符串
     */
    setInternalHtml: function (htmlStr) {
        // 每次初始化之前应该先重置对象属性
        this.destructObj();
        this.htmlStr = htmlStr;
    },

    /**
    * 将获取的字符串转为dom element
    *
    */
    createXml: function () {
        var domWrap = document.createElement('div');
        domWrap.innerHTML = this.htmlStr;
        this.htmlElement = domWrap;
     },

    /**
    * 遍历整个dom element
    *
    */
    traversalDom: function () {
        var rootNode = document.createNodeIterator(this.htmlElement, 1, null, false);
        var nodeList = rootNode.nextNode();
        while (nodeList !== null) {
            this.correctClass(nodeList);
            nodeList = rootNode.nextNode();
        }
    },

    /**
     * mip标签融合处理
     *
     * @param { Object } nodeDom dom对象
     */
    fuseMipHtml: function (nodeDom) {
        if (!nodeDom) {
            return;
        }

        MipUeditor.MipHtmlTool.filterHtml(nodeDom);
    },

    /**
    * 修正dom节点中style自定义样式
    *
    * @param { Object } nodeDom dom对象
    */
    correctClass: function (nodeDom) {
        if (!nodeDom) {
            return;
        }

        var styleText = nodeDom.getAttribute('style');
        if (styleText) { // 该标签上之定义了style
            var className = nodeDom.className;
            var domClassName = this.createClassName(styleText);
            if (className) { // 如果该标签已经存在classname
                domClassName = className + ' ' + domClassName;
            }

            nodeDom.className = domClassName;
            this.addPageComputeStyle(styleText);
            this.removeDomStyle(nodeDom);
        }

        this.fuseMipHtml(nodeDom);
    },

    /**
    * 移除整个dom上的style标签
    *
    * @param { Object } nodeDom dom对象
    */
    removeDomStyle: function (nodeDom) {
        if (!nodeDom) {
            return;
        }

        nodeDom.removeAttribute('style');
    },

    /**
    * 增加整个页面的计算样式
    *
    * @param { string } styleText 获取到Domstyle字符串
    */
    addPageComputeStyle: function (styleText) {
        if (!styleText) {
            return;
        }

        this.computeStyle += this.createStyleForOne(styleText);
    },

    /**
     * 创建一个demo的计算样式
     *
     * @param { string } styleText 获取到Domstyle字符串
     * @return { string } 提取到的style
     */
    createStyleForOne: function (styleText) {
        if (!styleText) {
            return;
        }

        var MipClassName = this.createClassName(styleText);

        // 如果改class名称在页面中存在则返回空样式
        if (this.computeStyleArray.indexOf(MipClassName) >= 0) {
            return '';
        }

        this.computeStyleArray.push(MipClassName);
        var classNameOne = '.' + MipClassName;
        return classNameOne + '{' + styleText + '}';
    },

    /**
    * 创建一个唯一识别的classname
    *
    * @param { string } styleStr 样式字符串
    * @return { string }
    */
    createClassName: function (styleStr) {
        if (!styleStr) {
            return;
        }

        return 'mip-ueditor-ext-' + this.createHashName(styleStr);
    },

    /**
    * 析构函数 重置对象属性
    *
    */
    destructObj: function () {
        this.htmlStr = '';
        this.htmlElement;
        this.computeStyle = '';
        this.computeStyleArray = [];
        this.mipPage
    },

    /**
     *  hash算法实现classname唯一后缀标识
     *
     * @param {string } str 样式字符串
     * @return { string } hash字符串
     */
    createHashName: function (str) {
        str += '';
        var arr = [];
        var len = str.length;
        var arg = Math.SQRT2.toFixed(9) - 0;

        forEach(function (x) {
            arr[x] = 0;
        });

        for (var i = 0; i < str.length; i++) {
            calc(str.charCodeAt(i));
        }

        forEach(function (x) {
            arr[x] = arr[x].toString(16);
            if (arr[x].length < 2) {
                arr[x] = '0' + arr[x];
            }

        });

        arr.reverse();
        return arr.join('');

        function calc(nmb) {
            var c = nmb & 255;
            var next = nmb >> 8;
            forEach(function (x) {
                var h = (x ? arr[x - 1] : 0) + arr[x] + x + len + c;
                h += (h / arg).toFixed(9).slice(-3) - 0;
                arr[x] = h & 255;
            });
            if (next > 0) {
                calc(next);
            }
        }

        function forEach(func) {
            for (var i = 0; i < 16; i++) {
                func(i);
            }
        }
    }
};

MipUeditor.MipHtmlTool = {

    /**
     * 转换为mipimg标签
     *
     */
    transformMipimg: function () {
        var ele = this; // 当前this为node节点
        var thisTool = MipUeditor.MipHtmlTool;
        var src = ele.getAttribute('src');
        var wid = ele.getAttribute('width') || '';
        var hei = ele.getAttribute('height') || '';
        if (!src) {
            return;
        }

        var mipImgconfig = {
            'src': src,
            'responsive': 'container'
        };

        if (wid !=='' && hei !== '') {
            mipImgconfig['width'] = wid;
            mipImgconfig['height'] = hei;
        }

        var mipimg = document.createElement('mip-img');
        thisTool.setAttribute.call(mipimg, mipImgconfig);
        thisTool.replaceDom.call(this, mipimg);
    },

    /**
     * 转换为转为为mip-link标签
     *
     */
    transformMipa: function () {
        var ele = this; // 当前this为node节点
        var thisTool = MipUeditor.MipHtmlTool;
        var href = ele.getAttribute('href');
        var title = ele.getAttribute('title') || '';
        var text = ele.innerHTML;
        if (!href) {
            return;
        }

        var miplink = document.createElement('mip-link');
        thisTool.setAttribute.call(miplink, {
            'href': href,
            'title': title
        });
        miplink.innerHTML = text;
        thisTool.replaceDom.call(this, miplink);
    },

    /**
    * 过滤mip标签
    *
    * @param {Object} nodeDom dom对象
    */
    filterHtml: function (nodeDom) {
        var MipList = [
            'img',
            'a'
        ];
        var tagName = nodeDom.tagName.toLowerCase();
        if (MipList.indexOf(tagName) >= 0) {
            var prototypeName = 'transformMip' + tagName;
            this[prototypeName].call(nodeDom);
        }
    },

    /**
     * 将miphtml替换dom
     *
     * @param {Object} miphtml 创建mip对象
     */
    replaceDom: function (miphtml) {
        this.parentNode.replaceChild(miphtml, this);
    },

    /**
     * 封装setAttribute
     *
     * @param {Object} objAttr 传入需要设置数据的键值对
     */
    setAttribute: function (objAttr) {
        // 当前this为mipHtml节点
        for (var i in objAttr) {
            this.setAttribute(i, objAttr[i]);
        }
    }
};

var mipditor = new MipUeditor();

/**
 * MipUeditor对外入口
 *
 * @return { Object }
 */
function getMipContent (html) {
    mipditor.setInternalHtml(html);
    mipditor.createXml();
    mipditor.traversalDom();
    return {
        mipHtml: mipditor.htmlElement.innerHTML,
        mipStyle: mipditor.computeStyle
    };
};

function init (data) {
    let htmldata;
    let mipHtml;
    
    try {
        htmldata = JSON.parse(data);
    } catch (err) {
        htmldata = data;
    }
    
    if (typeof htmldata === 'object') {
        mipHtml = {};
        Object.keys(htmldata).forEach(function (key) {
            let html = htmldata[key];
            mipHtml[key] = getMipContent(html);
        });
    } else if (typeof htmldata === 'string') {
        mipHtml = getMipContent(htmldata);
    }
    console.log(mipHtml);
    return mipHtml;
}
