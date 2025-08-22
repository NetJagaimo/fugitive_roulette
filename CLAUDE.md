# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

這是一個專案，需求如下：
1. 提供一個隨機選擇人的轉盤遊戲
2. 純粹的前端
3. 可以填寫自己設定的列表，並可以一鍵打亂
4. 輪盤上會顯示列表中的字，每行代表一個項目
5. 選中後會顯示抽中的項目是什麼
6. 隨機抽選輪盤中的項目
7. 介面包含：轉盤、開始按鈕、項目列表（可編輯）
8. 輪盤是紅黑相間，但如果是奇數個項目，則其中一個會是綠色的，模擬輪盤遊戲的輪盤（roulette）
9. 輪盤照著列表的順序，從12點鐘方向，順時針排下來，而打亂指的是打亂列表中的數字順序，進而導致輪盤項目跟著打亂
10. 項目列表使用一個大的文字輸入框（textarea），讓使用者可以直接從外部貼入多個項目，每行一個項目