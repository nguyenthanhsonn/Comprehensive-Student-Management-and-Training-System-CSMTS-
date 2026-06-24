import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type Post } from '../../generated/prisma/client';
import { CreatePostDto } from './dto/create-post.dto';

const postWithAuthor = {
  author: {
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  },
} satisfies Prisma.PostInclude;

export type PostWithAuthor = Prisma.PostGetPayload<{
  include: typeof postWithAuthor;
}>;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePostDto): Promise<Post> {
    return this.prisma.post.create({
      data: dto,
    });
  }

  findAll(): Promise<PostWithAuthor[]> {
    return this.prisma.post.findMany({
      include: postWithAuthor,
      orderBy: { createdAt: 'desc' },
    });
  }
}
