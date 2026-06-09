import type { Request, Response } from "express";
import { matchingService } from "../services/matching.service.js";
import { postService } from "../services/post.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
  updatePostStatusSchema
} from "../validators/post.validator.js";

function requireStringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return value;
}

export const postController = {
  async create(request: Request, response: Response) {
    const input = createPostSchema.parse(request.body);
    const post = await postService.createPost(request.auth!, input);
    response.status(201).json(created({ post }, "Post created"));
  },

  async list(request: Request, response: Response) {
    const query = listPostsQuerySchema.parse(request.query);
    const result = await postService.listPublicPosts(query);
    response.json(ok(result));
  },

  async search(request: Request, response: Response) {
    const query = listPostsQuerySchema.parse(request.query);
    const result = await postService.listPublicPosts(query);
    response.json(ok(result));
  },

  async myPosts(request: Request, response: Response) {
    const query = listPostsQuerySchema.parse(request.query);
    const result = await postService.listMyPosts(request.auth!, query);
    response.json(ok(result));
  },

  async detail(request: Request, response: Response) {
    const detail = await postService.getPostDetail(requireStringParam(request.params.id, "id"));
    response.json(ok(detail));
  },

  async matches(request: Request, response: Response) {
    const postId = requireStringParam(request.params.id, "id");
    const matches = await matchingService.listMatches(postId);
    response.json(ok({ matches }));
  },

  async update(request: Request, response: Response) {
    const postId = requireStringParam(request.params.id, "id");
    const input = updatePostSchema.parse(request.body);
    const post = await postService.updatePost(request.auth!, postId, input);
    response.json(ok({ post }, "Post updated"));
  },

  async updateStatus(request: Request, response: Response) {
    const postId = requireStringParam(request.params.id, "id");
    const input = updatePostStatusSchema.parse(request.body);
    const post = await postService.updateStatus(request.auth!, postId, input.status);
    response.json(ok({ post }, "Post status updated"));
  },

  async remove(request: Request, response: Response) {
    const postId = requireStringParam(request.params.id, "id");
    const result = await postService.deletePost(request.auth!, postId);
    response.json(ok(result, "Post deleted"));
  }
};
