// 頁面清單：依序決定翻頁書的頁碼順序。
// 要新增/更換頁面，只要把圖片放進 images/ 資料夾，並在下面新增/修改一筆即可。
// inToc: 是否出現在「目錄」跳頁選單中；tocLabel/tocSub: 目錄上顯示的中／英文標題。
const BOOK_PAGES = [
  { src: 'images/01-cover.png', label: '封面', inToc: true, tocLabel: '封面', tocSub: 'COVER' },
  { src: 'images/02-notice.png', label: '預約須知', inToc: true, tocLabel: '預約須知', tocSub: 'RESERVATION POLICY' },
  { src: 'images/03-deposit.png', label: '儲值優惠', inToc: true, tocLabel: '儲值優惠', tocSub: 'PREPAID PLAN' },
  { src: 'images/04-korean-regular.png', label: '韓式皮膚保養｜常規', inToc: true, tocLabel: '韓式皮膚保養', tocSub: 'SKINCARE' },
  { src: 'images/05-korean-civasan.png', label: '韓式皮膚保養｜CIVASAN', inToc: true, tocLabel: '韓式皮膚保養｜CIVASAN', tocSub: 'SKINCARE · CIVASAN' },
  { src: 'images/06-korean-thesera.png', label: '韓式皮膚保養｜THESERA', inToc: true, tocLabel: '韓式皮膚保養｜THESERA', tocSub: 'SKINCARE · THESERA' },
  { src: 'images/07-brow.png', label: '眉毛管理', inToc: true, tocLabel: '眉毛管理', tocSub: 'EYEBROW' },
  { src: 'images/08-lash.png', label: '美睫管理', inToc: true, tocLabel: '美睫管理', tocSub: 'EYELASHES' },
  { src: 'images/09-wax.png', label: '熱蠟除毛', inToc: true, tocLabel: '熱蠟除毛', tocSub: 'HOT WAXING' },
  { src: 'images/10-body.png', label: '身體線條管理', inToc: true, tocLabel: '身體線條管理', tocSub: 'BODYCARE' },
  { src: 'images/11-relax.png', label: '舒壓保養', inToc: true, tocLabel: '舒壓保養', tocSub: 'RELAX' },
  { src: 'images/12-addon.png', label: '課程加購', inToc: true, tocLabel: '課程加購', tocSub: 'ADD-ON' },
];
