#!/bin/bash

# 检查是否安装了 gh 命令行工具
if ! command -v gh &> /dev/null; then
    echo "错误：未安装 GitHub CLI (gh)。请先安装：https://cli.github.com/"
    exit 1
fi

# 检查是否已登录 GitHub
if ! gh auth status &> /dev/null; then
    echo "请先登录 GitHub CLI："
    gh auth login
fi

# 获取版本号
version=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)

# 创建临时目录并打包
tmp_dir="build"
mkdir -p $tmp_dir
cp manifest.json icon.png popup.html popup.js style.css $tmp_dir/

# 创建 zip 文件
zip_name="domain-icp-info-v$version.zip"
cd $tmp_dir
zip -r "../$zip_name" ./*
cd ..
rm -rf $tmp_dir

echo "打包完成：$zip_name"

# 创建 release 标签
tag="v$version"

# 提示用户确认是否创建 release
read -p "是否创建 GitHub Release $tag？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 创建 release
    echo "正在创建 GitHub Release..."
    gh release create "$tag" \
        "$zip_name" \
        --title "Domain ICP Info $tag" \
        --notes "Domain ICP Info 浏览器扩展 $tag 版本发布" \
        --draft  # 创建为草稿状态，方便检查

    echo "✅ Release 创建成功！"
    echo "请访问 GitHub 仓库检查并发布这个草稿 release。"
else
    echo "已取消创建 Release。"
fi 