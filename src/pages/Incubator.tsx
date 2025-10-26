import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Lightbulb,
  MessageCircle,
  Heart,
  Sparkles,
  Star,
  ThumbsUp,
  Image as ImageIcon,
  Send,
  X,
  Tag,
  Search,
  Filter,
} from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  profiles: {
    name: string;
    role: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    name: string;
    role: string;
  };
}

interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: 'like' | 'love' | 'innovative' | 'interesting';
  created_at: string;
}

interface PostWithStats extends Post {
  comments: Comment[];
  reactions: Reaction[];
  commentCount: number;
  reactionCounts: {
    like: number;
    love: number;
    innovative: number;
    interesting: number;
  };
}

export default function Incubator() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('incubator_posts')
        .select(`
          *,
          profiles (name, role)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const { data: commentsData } = await supabase
        .from('incubator_comments')
        .select(`
          *,
          profiles (name, role)
        `)
        .order('created_at', { ascending: true });

      const { data: reactionsData } = await supabase
        .from('incubator_reactions')
        .select('*');

      const postsWithStats: PostWithStats[] = (postsData || []).map(post => {
        const postComments = (commentsData || []).filter(c => c.post_id === post.id);
        const postReactions = (reactionsData || []).filter(r => r.post_id === post.id);

        return {
          ...post,
          comments: postComments,
          reactions: postReactions,
          commentCount: postComments.length,
          reactionCounts: {
            like: postReactions.filter(r => r.reaction_type === 'like').length,
            love: postReactions.filter(r => r.reaction_type === 'love').length,
            innovative: postReactions.filter(r => r.reaction_type === 'innovative').length,
            interesting: postReactions.filter(r => r.reaction_type === 'interesting').length,
          },
        };
      });

      setPosts(postsWithStats);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || post.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-3 rounded-xl">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">The Incubator</h1>
              <p className="text-slate-600 mt-1">Share ideas, innovate together</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowCreatePost(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:from-orange-600 hover:to-pink-700 transition-all shadow-md"
        >
          <Sparkles className="w-5 h-5" />
          New Idea
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedTag
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedTag === tag
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No ideas yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onPostClick={setSelectedPost}
              onRefresh={fetchPosts}
              currentUserId={profile?.id}
            />
          ))}
        </div>
      )}

      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} onSuccess={fetchPosts} />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onRefresh={fetchPosts}
          currentUserId={profile?.id}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  onPostClick,
  onRefresh,
  currentUserId,
}: {
  post: PostWithStats;
  onPostClick: (post: PostWithStats) => void;
  onRefresh: () => void;
  currentUserId?: string;
}) {
  async function handleReaction(reactionType: 'like' | 'love' | 'innovative' | 'interesting') {
    const existingReaction = post.reactions.find(
      r => r.user_id === currentUserId && r.reaction_type === reactionType
    );

    if (existingReaction) {
      await supabase.from('incubator_reactions').delete().eq('id', existingReaction.id);
    } else {
      await supabase.from('incubator_reactions').insert({
        post_id: post.id,
        user_id: currentUserId,
        reaction_type: reactionType,
      });
    }

    onRefresh();
  }

  const userHasReacted = (type: string) =>
    post.reactions.some(r => r.user_id === currentUserId && r.reaction_type === type);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-48 object-cover cursor-pointer"
          onClick={() => onPostClick(post)}
        />
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3
              className="text-xl font-bold text-slate-900 mb-1 cursor-pointer hover:text-orange-600 transition-colors"
              onClick={() => onPostClick(post)}
            >
              {post.title}
            </h3>
            <p className="text-sm text-slate-600">
              by <span className="font-medium">{post.profiles.name}</span> ·{' '}
              <span className="text-xs">{new Date(post.created_at).toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        <p className="text-slate-700 mb-4 line-clamp-3">{post.content}</p>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReaction('like')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                userHasReacted('like')
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">{post.reactionCounts.like}</span>
            </button>
            <button
              onClick={() => handleReaction('love')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                userHasReacted('love')
                  ? 'bg-pink-100 text-pink-700'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">{post.reactionCounts.love}</span>
            </button>
            <button
              onClick={() => handleReaction('innovative')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                userHasReacted('innovative')
                  ? 'bg-purple-100 text-purple-700'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">{post.reactionCounts.innovative}</span>
            </button>
            <button
              onClick={() => handleReaction('interesting')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                userHasReacted('interesting')
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Star className="w-4 h-4" />
              <span className="text-sm font-medium">{post.reactionCounts.interesting}</span>
            </button>
          </div>
          <button
            onClick={() => onPostClick(post)}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{post.commentCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePostModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return;

    setUploading(true);

    try {
      let imageUrl = null;

      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('incubator-images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('incubator-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase.from('incubator_posts').insert({
        user_id: profile?.id,
        title,
        content,
        image_url: imageUrl,
        tags: tagsArray,
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Share Your Idea</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Give your idea a catchy title..."
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Describe your idea in detail..."
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-slate-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="product, innovation, design..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Image (optional)
            </label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-600">Click to upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:from-orange-600 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              {uploading ? 'Posting...' : 'Post Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PostDetailModal({
  post,
  onClose,
  onRefresh,
  currentUserId,
}: {
  post: PostWithStats;
  onClose: () => void;
  onRefresh: () => void;
  currentUserId?: string;
}) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('incubator_comments').insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment,
      });

      if (error) throw error;

      setNewComment('');
      onRefresh();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {post.image_url && (
            <img src={post.image_url} alt={post.title} className="w-full h-64 object-cover rounded-lg mb-6" />
          )}

          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-4">
              by <span className="font-medium">{post.profiles.name}</span> ·{' '}
              {new Date(post.created_at).toLocaleDateString()}
            </p>
            <p className="text-slate-700 whitespace-pre-wrap">{post.content}</p>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-md text-sm font-medium">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Comments ({post.commentCount})
            </h3>

            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {post.comments.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No comments yet. Be the first!</p>
              ) : (
                post.comments.map(comment => (
                  <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-slate-900">{comment.profiles.name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
