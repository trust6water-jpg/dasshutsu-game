const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: 'ZbuxHHesp2qRAGo+TcGRMOLHKhc+AxlLnWDMNTlYva+HtwLhv+Ohn4ise4dxqPo0ZBAF/jSxmSvktt/ijc39gEYxpiOo5qEG5L8BBWNmUQkNHLNh5X3KJZ9Hdtm3RTPPfUFRUHxxizRfEMqsqxth1gdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'b2905be80df1084fedd58c9707bf0f23'
};

const client = new line.Client(config);
const app = express();

app.use(express.static('public'));

// ★ご自身の Bin ID と Master Key を設定してください
const JSONBIN_BIN_ID = '6a926d64da38895dfe1f0692';
const JSONBIN_API_KEY = '$2a$10$UfzCnji2r2eFh1Xz.FqA4eHMZfwAeOAUf9gGcBuixJLbynSZxJ0qa';

let db = {};

// クラウドからデータを読み込む
async function loadData() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await res.json();
    db = data.record || {};
  } catch (e) {
    console.error('DB読み込みエラー:', e);
  }
}

// クラウドにデータを保存する（非同期実行）
async function saveData() {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(db)
    });
  } catch (e) {
    console.error('DB保存エラー:', e);
  }
}

// サーバー起動時にクラウドからデータを取得
loadData();

const BASE_URL = 'https://dasshutsu-game.onrender.com';

app.post('/webhook', express.json(), async (req, res) => {
  res.status(200).end(); // 最速でLINEに200 OKを返す
  const events = req.body.events || [];
  
  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error('イベント処理中にエラーが発生しました:', err);
    }
  }
});

async function handleEvent(event) {
  try {
    if (
      event.replyToken === '00000000000000000000000000000000' ||
      event.replyToken === 'ffffffffffffffffffffffffffffffff'
    ) {
      return null;
    }

    const userId = event.source ? event.source.userId : null;
    if (!userId) return null;

    if (!db[userId] || !Array.isArray(db[userId])) {
      db[userId] = [];
    }

    // 1. テキストメッセージを受信した場合
    if (event.type === 'message' && event.message && event.message.type === 'text') {
      const rawText = event.message.text || '';
      const text = rawText.trim().toLowerCase();

      if (text.includes('nazono箱')) {
        if (!db[userId].includes('謎の箱')) {
          db[userId].push('謎の箱');
          saveData();
        }

        return await client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '「檻の鍵入り」と書いてある！ナンバーロックがかかっているようだ。ナンバーを導き出して、半角で入力しよう！'
          },
          {
            type: 'image',
            originalContentUrl: `${BASE_URL}/box.jpg`,
            previewImageUrl: `${BASE_URL}/box.jpg`
          }
        ]);
      }

      if (text.includes('10')) {
        if (!db[userId].includes('謎の箱')) {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'まずは箱を手に入れる必要があるようだ。'
          });
        }

        if (!db[userId].includes('謎の鍵')) {
          db[userId].push('謎の鍵');
          saveData();
        }

        return await client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '🔓 ロックが解除された！『謎の鍵』を手に入れた！'
          },
          {
            type: 'image',
            originalContentUrl: `${BASE_URL}/key.jpg`,
            previewImageUrl: `${BASE_URL}/key.jpg`
          }
        ]);
      }

      if (text.includes('管理shitsu')) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '管理室が開いた！！\n管理室に向かおう！\n\n※この画面を管理室前のスタッフに見せよう！'
        });
      }

      if (text.includes('持ち物') || text.includes('アイテム')) {
        return await sendInventoryFlex(event.replyToken, userId);
      }

      if (text.includes('スタッフそうさ') || text.includes('スタッフ操作')) {
        return await sendStaffKanriFlex(event.replyToken);
      }

      if (text.includes('カベ') || text.includes('壁')) {
        if (!db[userId].includes('レバー回路装置')) {
          db[userId].push('レバー回路装置');
          saveData();
        }
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '入り口のシャッターを解放できる【レバー回路装置】があった。\n起動するにはコードを入力しないといけないようだ…\n（※コードを入力する際は「持ち物」と入力して「レバー回路装置」を選択してね）'
        });
      }

      if (text.includes('ヒキダシ') || text.includes('引き出し') || text.includes('ひきだし')) {
        if (!db[userId].includes('園内共通のマスターキー')) {
          db[userId].push('園内共通のマスターキー');
          saveData();
        }
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '【園内共通のマスターキー】を手に入れた！\n※マスターキーは動物園入り口以外の園内の建物なら、なんでも開閉できるよ。\n使えそうな場所は【管理室のマップ】から探してね！\n（「持ち物」と入力すれば、使用する画面が出てくるよ）'
        });
      }

      if (text.includes('クローゼット')) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'サイズもバラバラな4人分の服が乱雑に入っていた。'
        });
      }

      if (text.includes('アフリカライオンノタテガミ') || text.includes('アフリカライオンのタテガミ')) {
        return await client.replyMessage(event.replyToken, [
          {
            type: 'image',
            originalContentUrl: `${BASE_URL}/tategami.jpg`,
            previewImageUrl: `${BASE_URL}/tategami.jpg`
          },
          {
            type: 'text',
            text: '黒い鳥がライオンの後ろ姿を見にいってくれたみたいだ！'
          }
        ]);
      }

      if (text.includes('エンチョウシツ') || text.includes('園長室')) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '園長室に入った！何を調べますか？\n〈探索可能箇所〉\nホンダナ、テーブル'
        });
      }

      if (text.includes('ホンダナ') || text.includes('本棚')) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '【理想の動物園計画】があった\n（※鳥にこの画面を見せに行こう）'
        });
      }

      if (text.includes('テーブル')) {
        if (!db[userId].includes('鏡')) {
          db[userId].push('鏡');
          saveData();
        }
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '『鏡』を手に入れた！（いつでも使えるよ。使う時は「持ち物」と入力してね）'
        });
      }

      if (text.includes('自分達') || text.includes('ジブンタチ') || text.includes('私達') || text.includes('ワタシタチ')|| text.includes('ペンギン')|| text.includes('レッサーパンダ')|| text.includes('ウサギ')|| text.includes('ゾウ') ) {
        if (!db[userId].includes('mirror_self')) {
          db[userId].push('mirror_self');
          saveData();
        }
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '人間の姿に戻ることができた！'
        });
      }

      if (text.includes('ホカノドウブツ') || text.includes('ホカノドウブツタチ') || text.includes('ベツノドウブツタチ') || text.includes('ベツノドウブツ')|| text.includes('クマ')|| text.includes('ネコ') ) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '変化はなかったようだ…'
        });
      }

      if (text.includes('ゴクラクチョウ') || text.includes('極楽鳥')) {
        if (!db[userId].includes('mirror_bird')) {
          db[userId].push('mirror_bird');
          saveData();
        }
        return await client.replyMessage(event.replyToken, [
          {
            type: 'image',
            originalContentUrl: `${BASE_URL}/shiikuin.jpg`,
            previewImageUrl: `${BASE_URL}/shiikuin.jpg`
          },
          {
            type: 'text',
            text: '人間に戻してくれてありがとう！\n君たちのおかげで、元の姿に戻ることができたよ！\nあとは、ここから脱出するだけだね！\n僕は元に戻ったばかりで、記憶がまだ朧げだから何も手伝えないけど、君たちならここから脱出できるはずだよね！'
          }
        ]);
      }

      if (text.includes('ジユウヘノトビラ') || text.includes('自由への扉')) {
        return await client.replyMessage(event.replyToken, {
          type: 'flex',
          altText: 'レバー回路が起動した！',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'レバー回路が起動した！',
                  weight: 'bold',
                  size: 'lg',
                  align: 'center'
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  action: {
                    type: 'postback',
                    label: '今すぐ動物園から脱出する？',
                    data: 'action=escape'
                  }
                }
              ]
            }
          }
        });
      }

      if (text.includes('シイクインシツ') || text.includes('飼育員室')) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '飼育員室に入った！\n【飼育員の日誌】があった。\n（※鳥にこの画面を見せに行こう）'
        });
      }

      if (text.includes('ドウブツエンイリグチ') || text.includes('動物園入り口')) {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '開かないようだ'
        });
      }

      return await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '…？'
      });
    }

    // 2. Postback処理
    if (event.type === 'postback') {
      const params = new URLSearchParams(event.postback.data);
      const action = params.get('action');

      if (action === 'start_search') {
        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '管理室に入って探索したい箇所を覚えよう！\n\n（※席に戻ってから、探索したい箇所をカタカナで入力しよう！）'
        });
      }

      if (action === 'escape') {
        const hasSelf = db[userId].includes('mirror_self');
        const hasBird = db[userId].includes('mirror_bird');

        if (hasSelf && hasBird) {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '🎉 大成功！\n鳥の姿になっていた飼育員さんも、鏡の力で無事に人間の姿へ戻ることができました。\nもちろん、あなたたちも元の姿を取り戻すことに成功！\n飼育員さんと一緒に動物園から脱出することができました。\nこれにて、夜の動物園からの脱出成功です！'
          });
        }

        if (hasSelf && !hasBird) {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '🎉 元の姿に戻ることができた！\nあなたたちは鏡の力を使って、無事に元の姿へ戻ることができました。\nそして、そのまま動物園から脱出することにも成功しました！\n……どうやら、これで一件落着（？）のようです。\nおめでとうございます！！'
          });
        }

        return await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'あなたたちはレバー回路装置のコードを導き出し、動物園から脱出することができた！\n…しかし、\nウサギやレッサーパンダ、ペンギンはマンホールの中などに隠れることができましたが…\nぞうさん…あなたは隠れられませんでした。\n残念なことに、ぞうさんは麻酔銃を撃たれ…動物園に戻ることになってしまいました。\n\n他の脱出手段はなかったのでしょうか…？（時間があるかぎり探索してみて！）'
        });
      }

      if (action === 'use_item') {
        const selectedItem = params.get('item');

        if (selectedItem === '園内共通のマスターキー') {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'どこで使用しますか？\n（カタカナで場所を入力してね）'
          });
        }

        if (selectedItem === '鏡') {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '何に使用しますか？\n（カタカナで対象を入力してね）'
          });
        }

        if (selectedItem && (selectedItem.includes('レバー') || selectedItem.includes('回路'))) {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'レバー回路起動のコードをカタカナで入力してね'
          });
        }

        return await sendCombineSelectFlex(event.replyToken, userId, selectedItem);
      }

      if (action === 'combine') {
        const item1 = params.get('item1');
        const item2 = params.get('item2');

        const isKey = (s) => s && (s.includes('鍵') || s.includes('key'));
        const isBox = (s) => s && (s.includes('箱') || s.includes('box'));

        if ((isKey(item1) && isBox(item2)) || (isKey(item2) && isBox(item1))) {
          db[userId] = db[userId].filter(i => 
            i !== '謎の箱' && 
            i !== '謎の鍵' && 
            i !== item1 && 
            i !== item2 && 
            !i.includes('箱') && 
            !i.includes('鍵')
          );
          saveData();

          return await client.replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '『謎の鍵』で『謎の箱』を開けた！\n中から脱出用の仕掛けが作動した！'
            },
            {
              type: 'text',
              text: '🎉 檻からの脱出成功！！\n※鳥にこの画面を見せてください。'
            }
          ]);
        } else {
          return await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `『${item1}』と『${item2}』では何も起きなかった…`
          });
        }
      }
    }
  } catch (error) {
    console.error('個別処理エラー（ガード発動）:', error);
  }
}

async function sendInventoryFlex(replyToken, userId) {
  const items = (db[userId] || []).filter(item => !item.startsWith('mirror_'));
  
  if (items.length === 0) {
    return client.replyMessage(replyToken, { type: 'text', text: '現在、持ち物は何もありません。' });
  }

  const bubbles = items.map(item => ({
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: item, weight: 'bold', size: 'xl', align: 'center' }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          action: {
            type: 'postback',
            label: '使用する',
            data: `action=use_item&item=${encodeURIComponent(item)}`
          }
        }
      ]
    }
  }));

  return client.replyMessage(replyToken, {
    type: 'flex',
    altText: '持ち物一覧',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  });
}

async function sendCombineSelectFlex(replyToken, userId, baseItem) {
  const items = (db[userId] || []).filter(i => i !== baseItem && !i.startsWith('mirror_'));

  if (items.length === 0) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: `『${baseItem}』と組み合わせられる他のアイテムを持っていません。`
    });
  }

  const buttons = items.map(targetItem => ({
    type: 'button',
    style: 'secondary',
    margin: 'sm',
    action: {
      type: 'postback',
      label: `『${targetItem}』と組み合わせる`,
      data: `action=combine&item1=${encodeURIComponent(baseItem)}&item2=${encodeURIComponent(targetItem)}`
    }
  }));

  return client.replyMessage(replyToken, {
    type: 'flex',
    altText: '組み合わせの選択',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `『${baseItem}』をどれに使用しますか？`, weight: 'bold', size: 'md' },
          ...buttons
        ]
      }
    }
  });
}

async function sendStaffKanriFlex(replyToken) {
  return client.replyMessage(replyToken, {
    type: 'flex',
    altText: '管理室',
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: `${BASE_URL}/kanri.jpg`,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '管理室',
            weight: 'bold',
            size: 'xl',
            align: 'center'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '探索開始！',
              data: 'action=start_search'
            }
          }
        ]
      }
    }
  });
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 LINE Webhook サーバーが起動しました（ポート: ${PORT}）`);
});
