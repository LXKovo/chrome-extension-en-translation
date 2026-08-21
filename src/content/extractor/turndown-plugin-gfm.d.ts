/**
 * turndown-plugin-gfm 未内置类型声明，这里补充最小类型。
 * 仅描述本项目用到的 `gfm` 插件入口。
 */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export function gfm(turndownService: TurndownService): void;
  export function tables(turndownService: TurndownService): void;
  export function strikethrough(turndownService: TurndownService): void;
  export function taskListItems(turndownService: TurndownService): void;
  export function highlightedCodeBlock(turndownService: TurndownService): void;
}
