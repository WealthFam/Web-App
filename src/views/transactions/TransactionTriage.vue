<template>
    <div class="triage-view space-y-6">
        <!-- PENDING TAB -->
        <div v-if="activeTab === 'pending'" class="space-y-4 animate-in fade-in">
            <Alert variant="default" class="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                <ShieldAlert class="h-4 w-4 stroke-blue-600 dark:stroke-blue-400" />
                <AlertTitle class="font-bold">Review Intake</AlertTitle>
                <AlertDescription>
                    These transactions were auto-detected but require categorization or confirmation before affecting your balance.
                </AlertDescription>
            </Alert>

            <!-- Filters Toolbar -->
            <Card class="p-3">
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <div class="relative flex-1">
                        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input :model-value="triageSearchQuery" @update:model-value="emit('update:triageSearchQuery', $event as string)" placeholder="Search description or recipient..." class="pl-8 h-9" />
                    </div>
                    
                    <div class="h-4 w-px bg-border hidden md:block"></div>

                    <div class="flex items-center bg-muted/50 p-1 rounded-lg">
                        <Button variant="ghost" size="sm" :class="{ 'bg-background shadow-sm': triageSourceFilter === 'ALL' }" class="h-7 px-3 rounded-md text-xs" @click="emit('update:triageSourceFilter', 'ALL')">All</Button>
                        <Button variant="ghost" size="sm" :class="{ 'bg-background shadow-sm': triageSourceFilter === 'SMS' }" class="h-7 px-3 rounded-md text-xs" @click="emit('update:triageSourceFilter', 'SMS')">SMS</Button>
                        <Button variant="ghost" size="sm" :class="{ 'bg-background shadow-sm': triageSourceFilter === 'EMAIL' }" class="h-7 px-3 rounded-md text-xs" @click="emit('update:triageSourceFilter', 'EMAIL')">Email</Button>
                    </div>

                    <div class="h-4 w-px bg-border hidden md:block"></div>

                    <div class="flex items-center gap-2">
                        <Select :model-value="triageSortKey" @update:model-value="emit('update:triageSortKey', $event)">
                            <SelectTrigger class="w-[140px] h-9">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="amount">Amount</SelectItem>
                                <SelectItem value="description">Description</SelectItem>
                            </SelectContent>
                        </Select>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="outline" size="icon" class="h-9 w-9" @click="emit('update:triageSortOrder', triageSortOrder === 'asc' ? 'desc' : 'asc')">
                                        <ArrowUpNarrowWide v-if="triageSortOrder === 'asc'" class="h-4 w-4" />
                                        <ArrowDownNarrowWide v-else class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Sort by {{ triageSortOrder === 'asc' ? 'Descending' : 'Ascending' }}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </Card>

            <!-- Bulk Actions -->
            <div class="flex justify-between items-center px-1">
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <Checkbox :checked="selectedTriageIds.length === filteredTriageTransactions.length && filteredTriageTransactions.length > 0" @update:checked="toggleSelectAllTriage" />
                        Select All Filtered
                    </label>

                    <div v-if="selectedTriageIds.length > 0" class="animate-in fade-in">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="destructive" size="sm" class="h-8 gap-2" @click="emit('update:showDiscardConfirm', true)">
                                        <Trash2 class="h-3.5 w-3.5" /> Discard {{ selectedTriageIds.length }}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Discard {{ selectedTriageIds.length }} selected transactions</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('refreshTriage')">
                                <RotateCw class="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Refresh triage data</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <!-- Transactions Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card v-for="txn in filteredTriageTransactions" :key="txn.id" class="relative overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30" :class="{ 'ring-2 ring-primary bg-primary/5': selectedTriageIds.includes(txn.id) }">
                    <div class="absolute top-0 left-0 right-0 h-[3px] z-10" :class="Number(txn.amount) < 0 ? 'bg-gradient-to-r from-red-500/80 to-transparent' : 'bg-gradient-to-r from-emerald-500/80 to-transparent'"></div>
                    
                    <div class="p-4 pb-2 flex items-start gap-3">
                        <Checkbox :checked="selectedTriageIds.includes(txn.id)" @update:checked="(val: boolean) => { const n = new Set(selectedTriageIds); if(val) n.add(txn.id); else n.delete(txn.id); selectedTriageIds = Array.from(n); }" class="mt-1" />
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-sm truncate" :title="txn.recipient || txn.description">{{ txn.recipient || txn.description }}</h4>
                            <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium mt-0.5">
                                <span>{{ formatDate(txn.date).day }}</span>
                                <span>•</span>
                                <span>{{ txn.source }}</span>
                                <Badge v-if="txn.latitude" variant="secondary" class="h-4 text-[10px] px-1 gap-0.5"><MapPin class="h-2.5 w-2.5"/> GPS</Badge>
                                <Badge v-if="txn.external_id" variant="outline" class="h-4 text-[10px] px-1">{{ txn.external_id }}</Badge>
                            </div>
                        </div>
                    </div>

                    <div class="bg-muted/30 border-y border-border/50 py-4 flex flex-col items-center justify-center">
                        <div class="text-3xl font-black tracking-tight" :class="Number(txn.amount) < 0 ? 'text-red-500' : 'text-emerald-500'">
                            {{ formatAmount(Math.abs(Number(txn.amount))) }}
                        </div>
                        <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{{ Number(txn.amount) < 0 ? 'Debit' : 'Credit' }}</div>
                    </div>

                    <CardContent class="flex-1 p-4 flex flex-col gap-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                            <Zap class="h-3.5 w-3.5" /> {{ getAccountName(txn.account_id) }}
                        </div>
                        
                        <div v-if="txn.raw_message" class="bg-muted/50 rounded-xl border border-dashed border-border/50 p-3">
                            <div class="text-xs italic text-muted-foreground line-clamp-3">
                                {{ txn.raw_message }}
                            </div>
                        </div>

                        <div class="flex items-center gap-2 mt-auto">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="outline" size="sm" class="h-7 text-xs rounded-full gap-1.5 px-3" :class="{ 'bg-blue-500/10 text-blue-500 border-blue-500/20': txn.is_transfer }" @click="txn.is_transfer = !txn.is_transfer; if (txn.is_transfer) txn.exclude_from_reports = true">
                                            <ArrowLeftRight class="h-3 w-3" /> Transfer
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Mark as internal transfer</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="outline" size="sm" class="h-7 text-xs rounded-full gap-1.5 px-3" :class="{ 'bg-muted text-muted-foreground border-border': txn.exclude_from_reports }" @click="txn.exclude_from_reports = !txn.exclude_from_reports">
                                            <EyeOff class="h-3 w-3" /> Hide
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Exclude from budget/reports</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div class="space-y-2 pt-1">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-muted-foreground w-16 shrink-0">Category</span>
                                <Select v-model="txn.category">
                                    <SelectTrigger class="h-8 flex-1 text-xs">
                                        <div class="flex items-center gap-2">
                                            <Tag class="h-3.5 w-3.5 text-primary" />
                                            <SelectValue placeholder="Category" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                                            <div :style="{ paddingLeft: `${opt.depth * 16}px` }" class="flex items-center gap-2 py-0.5">
                                                <span v-if="opt.depth > 0" class="text-muted-foreground/30 font-mono select-none text-[10px]">└</span>
                                                <span class="text-sm">{{ opt.icon }}</span>
                                                <span :class="opt.depth === 0 ? 'font-bold text-foreground' : 'text-muted-foreground font-medium'">
                                                    {{ opt.name }}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-muted-foreground w-16 shrink-0">Account</span>
                                <Select v-model="txn.account_id">
                                    <SelectTrigger class="h-8 flex-1 text-xs">
                                        <div class="flex items-center gap-2">
                                            <Landmark class="h-3.5 w-3.5 text-primary" />
                                            <SelectValue placeholder="Account" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="opt in accountOptions" :key="opt.value" :value="opt.value">{{ opt.title }}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div v-if="txn.is_transfer" class="flex items-center gap-2 animate-in slide-in-from-top-2">
                                <span class="text-xs font-bold text-muted-foreground w-16 shrink-0">To</span>
                                <Select v-model="txn.to_account_id">
                                    <SelectTrigger class="h-8 flex-1 text-xs">
                                        <SelectValue placeholder="Target Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="opt in accountOptions.filter(a => a.value !== txn.account_id)" :key="opt.value" :value="opt.value">{{ opt.title }}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>

                    <div class="bg-muted/20 border-t px-3 py-2 flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" @click="emit('rejectTriage', txn.id)">
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Discard transaction</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-primary" @click="openAliasModal(txn)">
                                        <MapPin class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Map merchant to alias</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground" @click="openTriageDetails(txn)">
                                        <Info class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>View full details</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div class="flex-1"></div>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="default" size="sm" class="h-8" :disabled="!txn.category || txn.category === 'Uncategorized'" @click="emit('approveTriage', txn)">
                                        <Check class="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Approve transaction</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </Card>
            </div>

            <!-- Empty State -->
            <div v-if="triagePagination.total === 0" class="text-center py-16 animate-in fade-in">
                <div class="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <CheckCircle2 class="h-12 w-12" />
                </div>
                <h3 class="text-2xl font-black">Inbox Zero!</h3>
                <p class="text-muted-foreground mt-2">No new transactions waiting for review.</p>
            </div>

            <!-- Pagination -->
            <div v-if="triagePagination.total > 0" class="flex items-center justify-end py-3 border-t text-sm text-muted-foreground">
                <div class="flex items-center mr-6">
                    <span class="mr-2">Rows per page:</span>
                    <Select :model-value="String(triagePagination.limit)" @update:model-value="handleTriagePaginationLimitChange(Number($event))">
                        <SelectTrigger class="h-7 w-16 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                            <SelectItem value="60">60</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="mr-6 font-bold text-foreground">
                    {{ triagePagination.skip + 1 }}-{{ Math.min(triagePagination.skip + triagePagination.limit, triagePagination.total) }} of {{ triagePagination.total }}
                </div>
                <div class="flex items-center gap-1">
                    <Button variant="ghost" size="icon" class="h-7 w-7" :disabled="triagePagination.skip === 0" @click="triageCurrentPage--">
                        <ChevronLeft class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7" :disabled="triagePagination.skip + triagePagination.limit >= triagePagination.total" @click="triageCurrentPage++">
                        <ChevronRight class="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- TRAINING TAB -->
        <div v-else-if="activeTab === 'training'" class="space-y-4 animate-in fade-in">
            <Alert variant="default" class="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                <Info class="h-4 w-4 stroke-amber-600 dark:stroke-amber-400" />
                <AlertTitle class="font-bold">Interactive Training</AlertTitle>
                <AlertDescription>
                    These messages look like transactions but could not be parsed. Label them to help the system learn!
                </AlertDescription>
            </Alert>

            <!-- Training Toolbar -->
            <Card class="p-3">
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <div class="flex items-center gap-4 shrink-0">
                        <label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <Checkbox :checked="selectedTrainingIds.length === unparsedMessages.length && unparsedMessages.length > 0" @update:checked="toggleSelectAllTraining" />
                            All
                        </label>
                        <div v-if="selectedTrainingIds.length > 0" class="animate-in fade-in">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Button variant="destructive" size="sm" class="h-8 gap-2" @click="emit('bulkDismissTraining')">
                                            <Trash2 class="h-3.5 w-3.5" /> Dismiss ({{ selectedTrainingIds.length }})
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Dismiss selected messages</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <div class="h-4 w-px bg-border hidden md:block"></div>

                    <div class="relative flex-1">
                        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input :model-value="trainingSearchQuery" @update:model-value="emit('update:trainingSearchQuery', $event as string)" placeholder="Search sender, subject..." class="pl-8 h-9" />
                    </div>

                    <div class="flex items-center gap-2 flex-wrap justify-end">
                        <div v-if="trainingSenderFilter" class="animate-in fade-in">
                            <Button variant="outline" size="sm" class="h-9 font-bold bg-primary/10 text-primary border-primary/20" @click="emit('update:trainingSenderFilter', null)">
                                <ScanSearch class="h-4 w-4 mr-2" />
                                Similar: {{ trainingSenderFilter }}
                                <X class="h-3.5 w-3.5 ml-2 opacity-50" />
                            </Button>
                        </div>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="outline" size="icon" class="h-9 w-9 text-red-500 border-red-200 bg-red-50" @click="emit('update:showSpamManager', true); emit('fetchSpamFilters')">
                                        <ShieldOff class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Manage Spam Filters</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Select :model-value="trainingSortKey" @update:model-value="emit('update:trainingSortKey', $event)">
                            <SelectTrigger class="w-[140px] h-9">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="created_at">By Date</SelectItem>
                                <SelectItem value="sender">By Sender</SelectItem>
                            </SelectContent>
                        </Select>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="outline" size="icon" class="h-9 w-9" @click="emit('update:trainingSortOrder', trainingSortOrder === 'asc' ? 'desc' : 'asc')">
                                        <ArrowUp v-if="trainingSortOrder === 'asc'" class="h-4 w-4" />
                                        <ArrowDown v-else class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Sort by {{ trainingSortOrder === 'asc' ? 'Descending' : 'Ascending' }}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-9 w-9" @click="emit('refreshTriage')">
                                        <RefreshCcw class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Refresh data</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </Card>

            <!-- Training Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card v-for="msg in sortedTrainingMessages" :key="msg.id" class="relative overflow-hidden flex flex-col transition-all hover:shadow-md">
                    <div class="absolute top-0 left-0 right-0 h-[3px] z-10 bg-gradient-to-r from-amber-400/80 to-transparent"></div>
                    
                    <div class="p-4 pb-2 flex items-start gap-3">
                        <Checkbox :checked="selectedTrainingIds.includes(msg.id)" @update:checked="(val: boolean) => { const n = new Set(selectedTrainingIds); if(val) n.add(msg.id); else n.delete(msg.id); selectedTrainingIds = Array.from(n); }" class="mt-1" />
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-sm truncate mb-1">{{ msg.sender || 'Unknown Sender' }}</h4>
                            <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                                <span>{{ formatDate(msg.created_at).day }}</span>
                                <span>•</span>
                                <span class="uppercase tracking-wider opacity-60">{{ msg.source }}</span>
                                <Badge v-if="msg.latitude" variant="secondary" class="h-4 text-[10px] px-1 gap-0.5"><MapPin class="h-2.5 w-2.5"/> GPS</Badge>
                                <Badge variant="default" class="h-4 text-[10px] px-1 ml-auto bg-primary">Needs Training</Badge>
                            </div>
                        </div>
                    </div>

                    <CardContent class="flex-1 p-4 flex flex-col gap-3">
                        <div v-if="msg.subject" class="text-xs text-muted-foreground font-bold">
                            Subject: <span class="text-foreground">{{ msg.subject }}</span>
                        </div>
                        
                        <div class="bg-amber-500/5 rounded-xl border border-amber-500/10 p-3 flex-1">
                            <div class="text-xs font-mono text-muted-foreground line-clamp-5">
                                {{ msg.raw_content }}
                            </div>
                        </div>
                    </CardContent>

                    <div class="bg-muted/20 border-t px-3 py-2 flex items-center gap-1 mt-auto">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:bg-muted" @click="emit('dismissTraining', msg.id)">
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Dismiss message</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-red-500 hover:bg-red-500/10" @click="emit('markAsSpam', msg.id)">
                                        <ShieldAlert class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Mark as spam</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-primary hover:bg-primary/10" @click="msg.sender ? emit('findSimilar', msg.sender) : null">
                                        <ScanSearch class="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Find similar messages</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div class="flex-1"></div>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="default" size="sm" class="h-8 gap-1.5" @click="emit('startLabeling', msg)">
                                        <Sparkles class="h-3.5 w-3.5" /> Train
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Label message</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </Card>
            </div>

            <!-- Empty State -->
            <div v-if="trainingPagination.total === 0" class="text-center py-16 animate-in fade-in">
                <div class="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <ShieldCheck class="h-12 w-12" />
                </div>
                <h3 class="text-2xl font-black">All Clear!</h3>
                <p class="text-muted-foreground mt-2">No unparsed messages waiting for training.</p>
            </div>

            <!-- Pagination -->
            <div v-if="trainingPagination.total > 0" class="flex items-center justify-end py-3 border-t text-sm text-muted-foreground">
                <div class="flex items-center mr-6">
                    <span class="mr-2">Rows per page:</span>
                    <Select :model-value="String(trainingPagination.limit)" @update:model-value="handleTrainingPaginationLimitChange(Number($event))">
                        <SelectTrigger class="h-7 w-16 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                            <SelectItem value="60">60</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="mr-6 font-bold text-foreground">
                    {{ trainingPagination.skip + 1 }}-{{ Math.min(trainingPagination.skip + trainingPagination.limit, trainingPagination.total) }} of {{ trainingPagination.total }}
                </div>
                <div class="flex items-center gap-1">
                    <Button variant="ghost" size="icon" class="h-7 w-7" :disabled="trainingPagination.skip === 0" @click="trainingCurrentPage--">
                        <ChevronLeft class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7" :disabled="trainingPagination.skip + trainingPagination.limit >= trainingPagination.total" @click="trainingCurrentPage++">
                        <ChevronRight class="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Modals -->

        <!-- Details Modal -->
        <Dialog :open="triageDetailsDialog" @update:open="(val) => triageDetailsDialog = val">
            <DialogContent class="sm:max-w-[600px] p-0 overflow-hidden">
                <DialogHeader class="bg-primary p-4 text-primary-foreground">
                    <DialogTitle>Transaction Details</DialogTitle>
                </DialogHeader>
                <div v-if="selectedTriageTxn" class="p-6">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <div class="text-lg font-black">{{ selectedTriageTxn.recipient || selectedTriageTxn.description }}</div>
                            <div class="text-xs text-muted-foreground">
                                {{ formatDate(selectedTriageTxn.date).day }} • {{ formatDate(selectedTriageTxn.date).meta }}
                                <span v-if="selectedTriageTxn.external_id">• Ref: {{ selectedTriageTxn.external_id }}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xl font-black" :class="Number(selectedTriageTxn?.amount || 0) < 0 ? 'text-red-500' : 'text-emerald-500'">
                                {{ formatAmount(Math.abs(Number(selectedTriageTxn?.amount || 0))) }}
                            </div>
                            <div class="text-[10px] font-bold text-muted-foreground uppercase">{{ Number(selectedTriageTxn?.amount || 0) < 0 ? 'DEBIT' : 'CREDIT' }}</div>
                        </div>
                    </div>

                    <div class="h-px bg-border mb-6"></div>

                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-muted-foreground">Account</label>
                            <Select v-model="selectedTriageTxn.account_id">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="opt in accountOptions" :key="opt.value" :value="opt.value">{{ opt.title }}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-muted-foreground">Category</label>
                            <Select v-model="selectedTriageTxn.category">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                                        <div :style="{ paddingLeft: `${opt.depth * 16}px` }" class="flex items-center gap-2 py-0.5">
                                            <span v-if="opt.depth > 0" class="text-muted-foreground/30 font-mono select-none text-[10px]">└</span>
                                            <span class="text-sm">{{ opt.icon }}</span>
                                            <span :class="opt.depth === 0 ? 'font-bold text-foreground' : 'text-muted-foreground font-medium'">
                                                {{ opt.name }}
                                            </span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div v-if="selectedTriageTxn?.is_transfer" class="space-y-2">
                            <label class="text-xs font-bold text-muted-foreground">{{ Number(selectedTriageTxn?.amount || 0) < 0 ? 'Transfer To' : 'Transfer From' }}</label>
                            <Select v-model="selectedTriageTxn.to_account_id">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="opt in accountOptions.filter(a => a.value !== selectedTriageTxn?.account_id)" :key="opt.value" :value="opt.value">{{ opt.title }}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div class="h-px bg-border my-6"></div>

                    <div class="flex flex-col gap-4">
                        <div class="flex items-center space-x-2">
                            <Switch id="transfer-switch" :checked="selectedTriageTxn.is_transfer" @update:checked="(val: boolean) => { selectedTriageTxn!.is_transfer = val; if(val) selectedTriageTxn!.exclude_from_reports = true; }" />
                            <label for="transfer-switch" class="text-sm font-medium leading-none cursor-pointer">Internal Transfer</label>
                        </div>
                        <div class="flex items-center space-x-2">
                            <Switch id="hide-switch" :checked="selectedTriageTxn.exclude_from_reports" @update:checked="(val: boolean) => selectedTriageTxn!.exclude_from_reports = val" />
                            <label for="hide-switch" class="text-sm font-medium leading-none cursor-pointer">Hide in Reports</label>
                        </div>
                    </div>

                    <div v-if="selectedTriageTxn.raw_message" class="mt-6">
                        <label class="text-xs font-bold text-muted-foreground mb-2 block">Raw Message</label>
                        <div class="bg-muted p-4 rounded-lg text-xs italic border">
                            {{ selectedTriageTxn.raw_message }}
                        </div>
                    </div>
                </div>
                <DialogFooter class="p-4 border-t bg-muted/20">
                    <Button variant="ghost" @click="triageDetailsDialog = false">Cancel</Button>
                    <Button @click="saveTriageDetails">Apply Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Add Alias Modal -->
        <MerchantAliasModal v-model="showAliasModal" :initial-pattern="aliasForm.pattern" :initial-alias="aliasForm.alias" @saved="emit('refreshTriage')" />

        <!-- Discard Confirmation Dialog (Triage) -->
        <Dialog :open="showDiscardConfirm" @update:open="(val) => emit('update:showDiscardConfirm', val)">
            <DialogContent class="sm:max-w-[400px] text-center border-red-500">
                <div class="flex justify-center mb-4 mt-2">
                    <div class="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <Trash2 class="h-7 w-7" />
                    </div>
                </div>
                <DialogHeader>
                    <DialogTitle class="text-center text-xl font-black">
                        {{ triageIdToDiscard ? 'Discard Transaction?' : `Discard ${selectedTriageIds.length} Transactions?` }}
                    </DialogTitle>
                    <DialogDescription class="text-center">
                        This action will permanently remove the selected transaction(s) from your inbox.
                    </DialogDescription>
                </DialogHeader>
                <div class="py-4">
                    <label class="flex items-center justify-center gap-2 text-sm font-bold text-red-600 cursor-pointer">
                        <Checkbox :checked="createIgnoreRule" @update:checked="(val: boolean) => emit('update:createIgnoreRule', val)" />
                        Ignore this pattern in future
                    </label>
                </div>
                <DialogFooter class="sm:justify-center flex gap-2">
                    <Button variant="outline" @click="emit('update:showDiscardConfirm', false)">Cancel</Button>
                    <Button variant="destructive" @click="triageIdToDiscard ? emit('confirmDiscard') : emit('confirmBulkDiscard')">Discard</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Discard Confirmation Dialog (Training) -->
        <Dialog :open="showTrainingDiscardConfirm" @update:open="(val) => emit('update:showTrainingDiscardConfirm', val)">
            <DialogContent class="sm:max-w-[400px] text-center border-red-500">
                <div class="flex justify-center mb-4 mt-2">
                    <div class="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <Trash2 class="h-7 w-7" />
                    </div>
                </div>
                <DialogHeader>
                    <DialogTitle class="text-center text-xl font-black">
                        {{ trainingIdToDiscard ? 'Dismiss Message?' : `Dismiss ${selectedTrainingIds.length} Messages?` }}
                    </DialogTitle>
                    <DialogDescription class="text-center">
                        This action will permanently remove these unparsed messages from training.
                    </DialogDescription>
                </DialogHeader>
                <div class="py-4">
                    <label class="flex items-center justify-center gap-2 text-sm font-bold text-red-600 cursor-pointer">
                        <Checkbox :checked="createIgnoreRule" @update:checked="(val: boolean) => emit('update:createIgnoreRule', val)" />
                        Don't show this sender again
                    </label>
                </div>
                <DialogFooter class="sm:justify-center flex gap-2">
                    <Button variant="outline" @click="emit('update:showTrainingDiscardConfirm', false)">Cancel</Button>
                    <Button variant="destructive" @click="trainingIdToDiscard ? emit('confirmTrainingDiscard') : emit('confirmBulkTrainingDiscard')">Dismiss</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Spam Manager Modal -->
        <Dialog :open="showSpamManager" @update:open="(val) => emit('update:showSpamManager', val)">
            <DialogContent class="sm:max-w-[600px] p-0 overflow-hidden">
                <DialogHeader class="bg-red-50 p-4 border-b border-red-100 flex flex-row items-center gap-2">
                    <ShieldOff class="h-5 w-5 text-red-500" />
                    <DialogTitle class="text-red-900 m-0">Spam Filter Management</DialogTitle>
                </DialogHeader>
                <div class="min-h-[400px] max-h-[70vh] overflow-y-auto">
                    <div v-if="spamFilters.length === 0" class="p-6">
                        <Alert class="bg-blue-50 border-blue-200">
                            <AlertDescription class="text-blue-800">You haven't blocked any senders yet.</AlertDescription>
                        </Alert>
                    </div>
                    <div v-else class="divide-y divide-border">
                        <div v-for="filter in spamFilters" :key="filter.id" class="p-4 flex items-center gap-4">
                            <div class="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
                                <ShieldAlert class="h-5 w-5" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-sm">{{ filter.sender || 'Unknown Sender' }}</h4>
                                <div class="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    <div v-if="filter.subject" class="truncate">Subject: {{ filter.subject }}</div>
                                    <div class="flex items-center gap-2">
                                        <span>Source: {{ filter.source }}</span>
                                        <span class="text-muted-foreground/30">|</span>
                                        <span>Blocked: <span class="text-red-500">{{ filter.count_blocked || 0 }} times</span></span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" @click="emit('removeSpamFilter', filter.id)">Unblock</Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import MerchantAliasModal from '@/components/MerchantAliasModal.vue'
import { useCurrency } from '@/composables/useCurrency'
import {
    Search, ArrowUpNarrowWide, ArrowDownNarrowWide, ArrowLeftRight, ArrowUp, ArrowDown,
    Trash2, RotateCw, Landmark, ShieldAlert, MapPin, Info, Check, Sparkles, X, Zap,
    CheckCircle2, ShieldCheck, RefreshCcw, ChevronLeft, ChevronRight,
    ShieldOff, ScanSearch, Tag, EyeOff
} from 'lucide-vue-next'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

export interface AccountItem { id: string; name: string; [key: string]: any }
export interface CategoryItem { id: string; name: string; icon?: string; color?: string; subcategories?: CategoryItem[]; [key: string]: any }
export interface TriageTransaction { id: string; date: string; amount: number | string; recipient?: string; description?: string; source?: string; external_id?: string; account_id: string; raw_message?: string; is_transfer?: boolean; exclude_from_reports?: boolean; category?: string; to_account_id?: string; latitude?: number; [key: string]: any }
export interface UnparsedMessage { id: string; created_at: string; sender?: string; source?: string; subject?: string; raw_content?: string; latitude?: number; [key: string]: any }

const props = defineProps<{
    activeSubTab: 'pending' | 'training'
    accounts: AccountItem[]
    categories: CategoryItem[]
    triageTransactions: TriageTransaction[]
    triagePagination: { total: number; limit: number; skip: number }
    triageSearchQuery: string
    triageSourceFilter: string
    triageSortKey: string
    triageSortOrder: 'asc' | 'desc'
    unparsedMessages: UnparsedMessage[]
    trainingPagination: { total: number; limit: number; skip: number }
    trainingSearchQuery: string
    trainingSortKey: string
    trainingSortOrder: 'asc' | 'desc'
    trainingSenderFilter: string | null
    trainingSubjectFilter: string | null
    spamFilters: any[]
    showSpamManager: boolean
    showDiscardConfirm: boolean
    showTrainingDiscardConfirm: boolean
    createIgnoreRule: boolean
    triageIdToDiscard: string | null
    trainingIdToDiscard: string | null
    showLabelForm: boolean
    selectedMessage: any
    labelForm: any
}>()

const emit = defineEmits([
    'update:activeSubTab',
    'update:triageSearchQuery',
    'update:triageSourceFilter',
    'update:triageSortKey',
    'update:triageSortOrder',
    'update:triagePagination',
    'update:trainingSortKey',
    'update:trainingSortOrder',
    'update:trainingPagination',
    'update:trainingSearchQuery',
    'update:trainingSenderFilter',
    'update:trainingSubjectFilter',
    'update:showSpamManager',
    'approveTriage',
    'rejectTriage',
    'bulkRejectTriage',
    'startLabeling',
    'dismissTraining',
    'bulkDismissTraining',
    'markAsSpam',
    'findSimilar',
    'removeSpamFilter',
    'fetchSpamFilters',
    'refreshTriage',
    'update:showDiscardConfirm',
    'update:showTrainingDiscardConfirm',
    'update:createIgnoreRule',
    'confirmDiscard',
    'confirmTrainingDiscard',
    'confirmBulkDiscard',
    'confirmBulkTrainingDiscard',
    'update:showLabelForm',
    'handleLabelSubmit'
])

const selectedTriageIds = defineModel<string[]>('selectedTriageIds', { default: [] })
const selectedTrainingIds = defineModel<string[]>('selectedTrainingIds', { default: [] })

const activeTab = computed({ get: () => props.activeSubTab, set: (val) => emit('update:activeSubTab', val) })

const accountOptions = computed(() => props.accounts.map(a => ({ title: a.name, value: a.id })))
const categoryOptions = computed(() => {
    const list: { title: string; value: string; name: string; icon: string; depth: number }[] = []
    const flatten = (cats: CategoryItem[], depth = 0) => {
        cats.forEach(c => {
            const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : ''
            list.push({ 
                title: `${prefix}${c.icon || '🏷️'} ${c.name}`, 
                value: c.name,
                name: c.name,
                icon: c.icon || '🏷️',
                depth
            })
            if (c.subcategories && c.subcategories.length > 0) flatten(c.subcategories, depth + 1)
        })
    }
    flatten(props.categories)
    if (!list.find(o => o.value === 'Uncategorized')) {
        list.push({ 
            title: '🏷️ Uncategorized', 
            value: 'Uncategorized',
            name: 'Uncategorized',
            icon: '🏷️',
            depth: 0
        })
    }
    return list
})

const filteredTriageTransactions = computed(() => {
    let filtered = props.triageTransactions
    if (props.triageSearchQuery) {
        const q = props.triageSearchQuery.toLowerCase()
        filtered = filtered.filter(t => (t.recipient && t.recipient.toLowerCase().includes(q)) || (t.description && t.description.toLowerCase().includes(q)) || (t.external_id && t.external_id.toLowerCase().includes(q)) || (t.amount && String(t.amount).includes(q)))
    }
    if (props.triageSourceFilter && props.triageSourceFilter !== 'ALL') filtered = filtered.filter(t => t.source === props.triageSourceFilter)
    return filtered
})

const triageCurrentPage = computed({
    get: () => Math.floor(props.triagePagination.skip / props.triagePagination.limit) + 1,
    set: (val) => emit('update:triagePagination', { ...props.triagePagination, skip: (val - 1) * props.triagePagination.limit })
})

const trainingCurrentPage = computed({
    get: () => Math.floor(props.trainingPagination.skip / props.trainingPagination.limit) + 1,
    set: (val) => emit('update:trainingPagination', { ...props.trainingPagination, skip: (val - 1) * props.trainingPagination.limit })
})

const sortedTrainingMessages = computed(() => {
    let messages = [...props.unparsedMessages]
    const key = props.trainingSortKey as any
    messages.sort((a, b) => {
        const valA = a[key]; const valB = b[key]
        if (valA < valB) return props.trainingSortOrder === 'asc' ? -1 : 1
        if (valA > valB) return props.trainingSortOrder === 'asc' ? 1 : -1
        return 0
    })
    return messages
})

function getAccountName(id: string) { const acc = props.accounts.find(a => a.id === id); return acc ? acc.name : 'Unknown Account' }
function formatDate(dateStr: string) {
    if (!dateStr) return { day: 'N/A', meta: '' }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { day: '?', meta: dateStr.split('T')[0] || dateStr }
    const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === today.toDateString()) return { day: 'Today', meta: time }
    if (d.toDateString() === yesterday.toDateString()) return { day: 'Yesterday', meta: time }
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (d.getFullYear() !== today.getFullYear()) formatOptions.year = 'numeric'
    return { day: d.toLocaleDateString('en-US', formatOptions), meta: time }
}

function toggleSelectAllTriage() {
    if (selectedTriageIds.value.length === filteredTriageTransactions.value.length && filteredTriageTransactions.value.length > 0) selectedTriageIds.value = []
    else selectedTriageIds.value = filteredTriageTransactions.value.map(t => t.id)
}

function toggleSelectAllTraining() {
    if (selectedTrainingIds.value.length === props.unparsedMessages.length && props.unparsedMessages.length > 0) selectedTrainingIds.value = []
    else selectedTrainingIds.value = props.unparsedMessages.map(m => m.id)
}

function handleTriagePaginationLimitChange(newLimit: number) { emit('update:triagePagination', { ...props.triagePagination, limit: newLimit, skip: 0 }) }
function handleTrainingPaginationLimitChange(newLimit: number) { emit('update:trainingPagination', { ...props.trainingPagination, limit: newLimit, skip: 0 }) }

const showAliasModal = ref(false)
const aliasForm = reactive({ pattern: '', alias: '', update_past: false })
function openAliasModal(txn: TriageTransaction) {
    aliasForm.pattern = txn.description || txn.recipient || ''
    aliasForm.alias = txn.recipient || ''
    showAliasModal.value = true
}

const triageDetailsDialog = ref(false)
const selectedTriageTxn = ref<TriageTransaction | null>(null)
function openTriageDetails(txn: TriageTransaction) {
    selectedTriageTxn.value = JSON.parse(JSON.stringify(txn))
    triageDetailsDialog.value = true
}
function saveTriageDetails() {
    if (!selectedTriageTxn.value) return
    const index = props.triageTransactions.findIndex(t => t.id === selectedTriageTxn.value?.id)
    if (index !== -1) Object.assign(props.triageTransactions[index], selectedTriageTxn.value)
    triageDetailsDialog.value = false
}

const { formatAmount } = useCurrency()
</script>
