/**
 * 关于页面组件
 * 展示博主的个人简介和技术背景
 */
export default function About() {
  return (
    <div className="w-full min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <header className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 tracking-tight">
            关于我
          </h1>
          <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            一名热衷于技术探索与分享的全栈开发者
          </p>
        </header>

        {/* 个人介绍卡片 */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-8 md:p-10 mb-12 transform transition-all hover:shadow-2xl">
          {/* 自我介绍内容 */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-6">
              大家好呀！欢迎来到我的技术教程博客，在这里我将和大家分享各类有趣又实用的技术知识。不过，在开启技术探讨之旅前，先让我来简单介绍一下自己吧。
            </p>

            <p className="text-gray-700 leading-relaxed mb-6">
              我叫 <span className="font-semibold text-blue-600">徐飞</span>
              ，化名<span className="font-semibold text-blue-600">若木</span>
              ，是一名热衷于钻研各种技术的{" "}
              <span className="font-semibold text-blue-600">全栈</span>
              技术爱好者，同时也希望能通过这个博客，把自己所学、所悟传递给更多志同道合的朋友。
            </p>

            <p className="text-gray-700 leading-relaxed mb-6">
              接触技术领域，对我来说就像是打开了一扇通往无限可能世界的大门。起初，我也是从最基础的知识学起，还记得刚开始学习编程的时候，面对那一行行代码，感觉既陌生又好奇。但就是那份想要探索代码背后奥秘的热情，驱使着我不断地去学习、实践。从简单的
              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">
                {" "}
                ”Hello, World!“{" "}
              </span>
              程序开始，一步步深入到更为复杂的项目开发中，这个过程虽然充满了挑战，但每一次成功解决问题后的那种成就感，让我越发着迷于技术的世界，也更加坚定了在这条道路上走下去的决心。
            </p>

            <div className="my-8 p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                技术专长
              </h3>
              <p className="text-gray-700 mb-4">
                在技术学习的漫漫长路上，我不断涉猎不同的技术方向，不过最终在
                <span className="font-semibold text-blue-600">
                  {" "}
                  JavaScript 框架应用、Node.js 服务端开发、数据库设计与优化
                </span>
                领域扎下了根。
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed mb-6">
              说到实际项目，我有幸参与了不少有意思的项目开发。比如，我曾经参与过一个
              <span className="font-semibold text-blue-600"> 全栈 </span>
              项目，我在这个项目中负责前端页面的开发，使用 Vue.js
              框架搭建页面结构，利用 Vue.js
              的组件化开发模式，将页面拆分成多个独立的组件，每个组件负责处理自己的业务逻辑。我还负责与后端开发人员合作，使用
              <span className="font-semibold text-blue-600"> RESTful API </span>
              进行数据交互，确保前端页面能够及时获取到最新的数据。
            </p>

            <p className="text-gray-700 leading-relaxed mb-6">
              而我创建这个技术教程博客的初衷，也是源于自己在学习过程中的一些感悟。我深知技术学习的道路并不平坦，刚入门时往往会因为找不到清晰的学习路径或者遇到问题无人解答而感到迷茫。所以，我希望能把自己在学习和实践中总结出来的经验、技巧，以及踩过的那些
              <span className="bg-yellow-100 px-2 py-0.5 rounded"> ”坑“ </span>
              都分享出来，帮助更多的新手朋友们少走弯路，更快地掌握技术要点，也希望能和各位资深的技术大佬们在这里交流探讨，共同进步。
            </p>

            <p className="text-gray-700 leading-relaxed mb-6">
              平时除了专注于技术学习和项目开发外，我还热衷于关注行业的最新动态和前沿技术趋势。我觉得技术领域发展日新月异，只有保持时刻学习、紧跟潮流的状态，才能不被时代淘汰，并且能将新的理念和技术融入到自己的日常工作与学习中，创造出更有价值的成果。
            </p>

            <p className="text-gray-700 leading-relaxed italic font-medium">
              这就是我，一个热爱技术、乐于分享的普通人，期待在这个博客中和大家一起探索技术的奥秘，共同成长进步呀！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
