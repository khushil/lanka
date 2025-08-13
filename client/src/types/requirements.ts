export interface Requirement {
  id: string;
  title: string;
  description: string;
  category: RequirementCategory;
  priority: Priority;
  status: RequirementStatus;
  stakeholders: string[];
  relatedRequirements: string[];
  projectId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  implementationStatus?: ImplementationStatus;
  similarityScore?: number;
  tags: string[];
  businessValue?: BusinessValue;
  effort?: Effort;
  risk?: Risk;
}

export enum RequirementCategory {
  FUNCTIONAL = 'functional',
  NON_FUNCTIONAL = 'non_functional',
  TECHNICAL = 'technical',
  BUSINESS = 'business',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  USABILITY = 'usability',
  COMPLIANCE = 'compliance'
}

export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  CRITICAL = 'critical'
}

export enum RequirementStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  IMPLEMENTED = 'implemented',
  REJECTED = 'rejected',
  DEPRECATED = 'deprecated'
}

export enum ImplementationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  TESTING = 'testing',
  COMPLETED = 'completed',
  BLOCKED = 'blocked'
}

export enum BusinessValue {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum Effort {
  EXTRA_LARGE = 'xl',
  LARGE = 'l',
  MEDIUM = 'm',
  SMALL = 's',
  EXTRA_SMALL = 'xs'
}

export enum Risk {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface RequirementSimilarity {
  id: string;
  requirementId: string;
  similarRequirement: Requirement;
  similarityScore: number;
  matchingFields: string[];
  projectName: string;
}

export interface RequirementComment {
  id: string;
  requirementId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  parentId?: string;
  reactions: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  userId: string;
  type: 'like' | 'dislike' | 'approve' | 'concern';
}

export interface RequirementRelationship {
  id: string;
  fromRequirementId: string;
  toRequirementId: string;
  relationshipType: RelationshipType;
  description?: string;
}

export enum RelationshipType {
  DEPENDS_ON = 'depends_on',
  BLOCKS = 'blocks',
  RELATED = 'related',
  CONFLICTS = 'conflicts',
  DUPLICATES = 'duplicates',
  DERIVED_FROM = 'derived_from'
}

export interface RequirementFilter {
  search?: string;
  category?: RequirementCategory[];
  priority?: Priority[];
  status?: RequirementStatus[];
  stakeholders?: string[];
  projectId?: string;
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface RequirementSort {
  field: keyof Requirement;
  direction: 'asc' | 'desc';
}

export interface RequirementsListProps {
  requirements: Requirement[];
  loading: boolean;
  onEdit: (requirement: Requirement) => void;
  onDelete: (id: string) => void;
  onView: (requirement: Requirement) => void;
  filter: RequirementFilter;
  onFilterChange: (filter: RequirementFilter) => void;
  sort: RequirementSort;
  onSortChange: (sort: RequirementSort) => void;
}

export interface RequirementFormData {
  title: string;
  description: string;
  category: RequirementCategory;
  priority: Priority;
  stakeholders: string[];
  relatedRequirements: string[];
  tags: string[];
  businessValue?: BusinessValue;
  effort?: Effort;
  risk?: Risk;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'requirement' | 'stakeholder' | 'project';
  category?: RequirementCategory;
  priority?: Priority;
  status?: RequirementStatus;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
  weight?: number;
}

export interface RequirementsGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}