module.exports = {
    //箭头函数参数只有一个时是否要有小括号。avoid：省略括号
    arrowParens: 'avoid',
    // 对象字面量的大括号内是否要有空格
    bracketSameLine: true,
    // 行结束符使用 UNIX格式
    // endOfLine: 'lf',
    // true:Puts the `>` of a multi-line HTML (JSX) element at the end of the last line instead of being alone on the next line.
    jsxBracketSameLine: false,
    //行宽
    printWidth: 100,
    //tab缩进大小
    tabWidth: 2,
    //是否使用tab进行缩进
    useTabs: false,
    //是否使用分号，默认值true
    semi: true,
    //是否使用单引号，默认值false
    singleQuote: true,
  // 后置逗号
    trailingComma: 'es5',
    parser: 'typescript',
}