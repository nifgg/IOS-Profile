// 2024-10-22 21:32

const url = $request.url;
const isQuanX = typeof $task !== "undefined";
if (!$response.body) $done({});
let obj = JSON.parse($response.body);

// 信息流：图片或视频相关
if (url.includes("/v1/note/imagefeed") || url.includes("/v2/note/feed") || url.includes("/v3/note/videofeed")) {
  if (obj?.data?.length > 0) {
    obj.data.forEach(item => {
      // 处理图片和视频的水印设置
      if (item?.media_save_config) {
        // 禁用保存限制和水印
        item.media_save_config.disable_save = false;
        item.media_save_config.disable_watermark = true;
        item.media_save_config.disable_weibo_cover = true;

        // 检查是否有其他可能的水印字段
        if (item.media_save_config.watermark_url) {
          // 删除水印链接
          delete item.media_save_config.watermark_url;
        }
      }

      // 处理分享信息中的下载限制
      if (item?.share_info?.function_entries?.length > 0) {
        const additem = { type: "video_download" };
        if (!item.share_info.function_entries.some(entry => entry.type === "video_download")) {
          item.share_info.function_entries.unshift(additem);
        }
      }
    });
    
    // 写入持久化存储，确保 note_list 和 images_list 存在
    if (obj?.data[0]?.note_list?.[0]?.images_list) {
      if (isQuanX) {
        $prefs.removeValueForKey("redBookLivePhoto");
        $prefs.setValueForKey(JSON.stringify(obj.data[0].note_list[0].images_list), "redBookLivePhoto");
      } else {
        $persistentStore.write("", "redBookLivePhoto");
        $persistentStore.write(JSON.stringify(obj.data[0].note_list[0].images_list), "redBookLivePhoto");
      }
    }
  }
} else if (url.includes("/v1/note/live_photo/save")) {
  // 实况照片保存请求
  let livePhoto;
  let newDatas = [];
  // 读取持久化存储
  if (isQuanX) {
    livePhoto = JSON.parse($prefs.valueForKey("redBookLivePhoto"));
  } else {
    livePhoto = JSON.parse($persistentStore.read("redBookLivePhoto"));
  }
  if (livePhoto?.length > 0) {
    livePhoto.forEach(item => {
      if (item.live_photo_file_id) {
        let myData = {
          file_id: item.live_photo_file_id,
          video_id: item.live_photo.media.video_id,
          url: item.live_photo.media.stream.h265[0].master_url
        };
        newDatas.push(myData);
      }
    });
  }

  if (obj?.data?.datas?.length > 0) {
    // 原始数据没问题 交换url数据
    obj.data.datas.forEach(itemA => {
      newDatas.forEach(itemB => {
        if (itemB.file_id === itemA.file_id && itemA.url.includes(".mp4")) {
          itemA.url = itemA.url.replace(/^https?:\/\/.*\.mp4$/g, itemB.url);
        }
      });
    });
  } else {
    // 原始数据有问题 强制返回成功响应
    obj = { code: 0, success: true, msg: "成功", data: { datas: newDatas } };
  }
} else if (url.includes("/v1/system_service/config")) {
  // 整体配置
  const item = ["app_theme", "loading_img", "splash", "store"];
  if (obj?.data) {
    item.forEach(i => {
      delete obj.data[i];
    });
  }
} else if (url.includes("/v2/note/widgets")) {
  // 详情页小部件
  const item = ["cooperate_binds", "generic", "note_next_step"];
  if (obj?.data) {
    item.forEach(i => {
      delete obj.data[i];
    });
  }
} else if (url.includes("/v2/system_service/splash_config")) {
  // 开屏广告
  if (obj?.data?.ads_groups?.length > 0) {
    obj.data.ads_groups.forEach(i => {
      i.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
      i.end_time = 3818419199;   // Unix 时间戳 2090-12-31 23:59:59
      if (i?.ads?.length > 0) {
        i.ads.forEach(ii => {
          ii.start_time = 3818332800;
          ii.end_time = 3818419199;
        });
      }
    });
  }
} else if (url.includes("/v2/user/followings/followfeed")) {
  // 关注页信息流 可能感兴趣的人
  if (obj?.data?.items?.length > 0) {
    obj.data.items = obj.data.items.filter(i => i?.recommend_reason === "friend_post");
  }
} else if (url.includes("/v3/note/videofeed")) {
  // 信息流 视频
  if (obj?.data?.length > 0) {
    obj.data.forEach(item => {
      if (item?.media_save_config) {
        item.media_save_config.disable_save = false;
        item.media_save_config.disable_watermark = true;
        item.media_save_config.disable_weibo_cover = true;
      }
      if (item?.share_info?.function_entries?.length > 0) {
        const additem = { type: "video_download" };
        if (item.share_info.function_entries[0]?.type !== "video_download") {
          item.share_info.function_entries.unshift(additem);
        }
      }
    });
  }
} else if (url.includes("/v4/followfeed")) {
  // 关注列表
  if (obj?.data?.items?.length > 0) {
    obj.data.items = obj.data.items.filter(i => !["recommend_user"].includes(i.recommend_reason));
  }
} else if (url.includes("/v5/recommend/user/follow_recommend")) {
  // 用户详情页 你可能感兴趣的人
  if (obj?.data?.title === "你可能感兴趣的人" && obj?.data?.rec_users?.length > 0) {
    obj.data = {};
  }
} else if (url.includes("/v6/homefeed")) {
  // 信息流广告过滤
  if (obj?.data?.length > 0) {
    let newItems = obj.data.filter(item => 
      !(item.model_type === "live_v2" || item.hasOwnProperty("ads_info") || item.hasOwnProperty("card_icon") || item?.note_attributes?.includes("goods"))
    );
    obj.data = newItems;
  }
} else if (url.includes("/v10/search/notes")) {
  // 搜索结果
  if (obj?.data?.items?.length > 0) {
    obj.data.items = obj.data.items.filter(i => i.model_type === "note");
  }
}

$done({ body: JSON.stringify(obj) });
