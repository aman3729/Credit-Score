import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { BarChart4, RefreshCw, Upload, UserPlus, Sparkles, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const Header = ({
  darkMode,
  toggleDarkMode,
  refreshing,
  pollingState,
  onRefresh,
  onOpenBatchUpload,
  onOpenRegister
}) => (
  <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 p-3 shadow-lg">
          <BarChart4 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground">Lender Dashboard</h1>
          <p className="text-lg text-muted-foreground">Advanced loan decision platform</p>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <Button
        onClick={onRefresh}
        variant="outline"
        size="lg"
        className="group border-border bg-card hover:bg-muted transition-all duration-300"
        disabled={pollingState?.consecutiveErrors >= 10}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform duration-300`} />
        Refresh
        {pollingState?.consecutiveErrors > 0 && (
          <Badge variant="destructive" className="ml-2 text-xs">
            {pollingState.consecutiveErrors}
          </Badge>
        )}
      </Button>
      
      <Button
        onClick={onOpenBatchUpload}
        variant="outline"
        size="lg"
        className="border-border bg-card hover:bg-muted transition-all duration-300"
      >
        <Upload className="h-4 w-4" />
        Batch Upload
      </Button>
      
      <Button
        onClick={onOpenRegister}
        size="lg"
        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity shadow-lg"
      >
        <UserPlus className="h-4 w-4" />
        Register User
      </Button>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="lg"
              className="border-border bg-card hover:bg-muted transition-all duration-300"
            >
              {darkMode ? (
                <Sparkles className="h-4 w-4 text-amber-500" />
              ) : (
                <Activity className="h-4 w-4 text-indigo-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Toggle {darkMode ? 'light' : 'dark'} mode
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
);

export default Header;


