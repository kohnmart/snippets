import Router from "express-promise-router";
import validate from "../schema/validate.js";
import postSchema from "../schema/post-schema.js";
import postsDB from "../db/posts.js";
import categoriesDB from "../db/categories.js";
import hasCategoriesDB from "../db/hasCategories.js";
import { isAuthorized } from "../util/auth.js";
import { refreshToken } from "./auth.js";

const posts = Router();

//query looks like this http://localhost:3000/v1/posts/?sorting_id=e8a86be5-aff1-426b-843f-2cb0a6a5699d&query_string=web
posts.get("/", refreshToken, async (req, res) => {
  let response = { status: "", result: "" };
  if (req.query.query_string == undefined) {
    response = await postsDB.getPosts(req.query.sorting_id);
  } else {
    response = await postsDB.getPosts(
      req.query.sorting_id,
      req.query.query_string
    );
  }
  res.status(response.status).json(response.result);
});

posts.get("/categories/", isAuthorized, refreshToken, async (req, res) => {
  const { status, result } = await postsDB.getPostsWithCategories(req.body.id);
  res.status(status).json(result);
});

posts.post("/", isAuthorized, validate({ body: postSchema }), refreshToken, async (req, res) => {
  //add a new post
  const json = {
    title: req.body.title,
    content: req.body.content,
    language_id: req.body.language_id,
    user_id: req.id,
  };
  let post = { result: "" },
    proxy = req.headers["x-forwarded-host"],
    host = proxy ? proxy : req.headers.host;
  post = await postsDB.postPost(json);
  res
    .set(
      "Location",
      `${req.protocol}://${host}${req.baseUrl}/${post.result.id}`
    )
    .status(post.result.status)
    .json(post.result);

  //look for the category
  let categoryArray = req.body.categories;
  let categoryIdArray = [];

  for (const key in categoryArray) {
    let c = categoryArray[key];
    let categoryJson = { status: "", result: "" };
    categoryJson = await categoriesDB.getCategories(c);
    //200: category already existing, use id
    if (categoryJson.status === 200) {
      categoryIdArray.push(categoryJson.result[0].id);
    } else {
      let newCategoryJson = { result: "" };
      newCategoryJson = await categoriesDB.postCategory({ name: c });
      categoryIdArray.push(newCategoryJson.result.id);
    }
  }

  for (const ca of categoryIdArray) {
    //connect post and category
    let hasCat = { result: "" };
    const jsonCat = {
      post_id: post.result.id,
      category_id: ca,
    };
    (hasCat = await hasCategoriesDB.postHasCategory(jsonCat)),
      (proxy = req.headers["x-forwarded-host"]),
      (host = proxy ? proxy : req.headers.host);
  }
});

posts.get("/:id", refreshToken, async (req, res) => {
  const { status, result } = await postsDB.getPost(req.params.id);

  if (status === 200) {
    res.status(status).json(result);
  } else {
    res.sendStatus(status);
  }
});

posts.patch("/:id", isAuthorized, validate({ body: postSchema }), refreshToken, async (req, res) => {
  let oldPost = { result: "" };
  oldPost = await postsDB.getPost(req.params.id);
  if (oldPost.result.status === 404) {
    return res.sendStatus(oldPost.result.status);
  }
  if (req.id !== oldPost.result.user_id) {
    return res.sendStatus(401);
  }

  //change post attributes first
  let newPost = { result: "" };
  newPost = await postsDB.patchPost(req.params.id, req.body);
  res.status(newPost.result.status).json(newPost.result);

  //then change the categories as well
  let oldPostCategories = { status: "", result: "" };
  //get categories of old post
  oldPostCategories = await postsDB.getPostsWithCategories(req.params.id);
  let oldCategories = [];
  let newCategories = req.body.categories;
  let categoryIdArray = [];

  //response means, there are categories in the post
  if (oldPostCategories.status != 404) {
    for (const key of oldPostCategories.result) {
      oldCategories.push(key.name);
    }
    //delete old categories not in new
    oldCategories = oldCategories.filter((x) => !newCategories.includes(x));
    //foreach is not async
    for (const key of oldPostCategories.result) {
      if (oldCategories.includes(key.name)) {
        let d = { result: "" };
        const jsonCat = {
          post_id: req.params.id,
          category_id: key.category_id,
        };
        d = await hasCategoriesDB.deleteHasCategory(jsonCat);
      }
    }
    //only add new categories not in old
    newCategories = newCategories.filter((x) => !oldCategories.includes(x));
  }

  //get ids of new categories
  for (const key in newCategories) {
    let c = newCategories[key];
    let categoryJson = { status: "", result: "" };
    categoryJson = await categoriesDB.getCategories(c);
    //200: category already existing, use id
    if (categoryJson.status === 200) {
      categoryIdArray.push(categoryJson.result[0].id);
    } else {
      //post new category and get id
      categoryJson = await categoriesDB.postCategory({ name: c });
      categoryIdArray.push(categoryJson.result.id);
    }
  }

  //post relation between post and new categories
  for (const ca of categoryIdArray) {
    //connect post and category
    let hasCat = { result: "" };
    const jsonCat = {
      post_id: req.params.id,
      category_id: ca,
    };
    hasCat = await hasCategoriesDB.postHasCategory(jsonCat);
  }
});

posts.delete("/:id", isAuthorized, refreshToken, async (req, res) => {
  let post = { status: "", result: "" };
  post = await postsDB.getPost(req.params.id);
  if (req.id !== post.result.user_id) {
    return res.sendStatus(401);
  }

  const { result } = await postsDB.deletePost(req.params.id, req.body);
  res.status(result.status).json(result);
});

export { posts, postSchema };

export default { posts, postSchema };
