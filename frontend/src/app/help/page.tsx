import React from 'react';
import fs from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import styles from './help.module.css'; // 1. Import your CSS module!
import { MdxComponents } from '@/components/help/Mdx';

function getHelpMdxContent() {
  const filePath = path.join(process.cwd(), 'public', 'helpMD', 'mainpage.mdx');
  return fs.readFileSync(filePath, 'utf-8');
}

export default function HelpPage() {
  const mdxSource = getHelpMdxContent();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg- (--container)] shadow-md rounded-xl p-8 border border- (--wrapper)]">
        {/* 2. Bind your custom CSS class and optional Tailwind prose together */}
        <article className={`${styles.markdownContainer} prose prose-slate dark:prose-invert max-w-none`}>
          <MDXRemote source={mdxSource} components={MdxComponents} />
        </article>
      </div>
    </div>
  );
}